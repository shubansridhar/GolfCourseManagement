// public/js/data.js
import { authenticatedFetch, currentUser, isAdmin } from './auth.js';
import { showNotification, showTableView } from './views.js';

const API_BASE_URL = '/api';

let currentTableStructure = [];
let currentPrimaryKeyField = '';

// near the top of the file (or wherever makes sense)
const noAddTables = [
    'MEMBER',
    'MEMBER_TEE_TIME',
    'EMPLOYEE',
    'EQUIPMENT_RENTAL',
    'GOLF_COURSE',
    'HOLE',
    // add any other table names here you want to disable “Add”
  ];

  // ---> ADDED Constants for Edit/Delete Permissions <---
const noEditTables = [
    'MEMBER', 'EMPLOYEE', 'MEMBER_TEE_TIME', 'EQUIPMENT_RENTAL', 'users'
];
const noDeleteTables = [
    'MEMBER', 'EMPLOYEE', 'users', 'GOLF_COURSE', 'MEMBERSHIP_PLAN', 'EQUIPMENT_TYPE'
];
// ----------------------------------------------------

  async function fetchTablesAndPopulateDashboard() {
    try {
        const placeholder = document.getElementById('dynamic-cards-placeholder');
        if (!placeholder) {
            console.error('#dynamic-cards-placeholder not found.');
            return;
        }

        placeholder.innerHTML = '<div class="loading" style="grid-column: 1 / -1;"><i class="fas fa-spinner fa-spin"></i> Loading tables...</div>';

        const response = await authenticatedFetch(`${API_BASE_URL}/tables`);
        if (!response.ok) throw new Error('Failed to fetch tables');
        let tables = await response.json();

        // Keep ONLY tables explicitly listed in customTitles
        const allowedTables = ['MEMBER', 'HOLE', 'EMPLOYEE', 'GOLF_COURSE', 'PLAN_DISCOUNT'];
        tables = tables.filter(table => allowedTables.includes(table.toUpperCase()));

        populateDashboard(tables, placeholder);
    } catch (error) {
        console.error('Error fetching tables:', error);
        showNotification('Failed to load tables. Please try again.', 'error');
        const placeholder = document.getElementById('dynamic-cards-placeholder');
        if (placeholder) {
            placeholder.innerHTML = '<p class="no-tables error" style="grid-column: 1 / -1;">Failed to load tables.</p>';
        }
    }
}


function populateDashboard(tables, targetElement) {
    if (!targetElement) return;
    if (!tables || tables.length === 0) {
        targetElement.innerHTML = '<p class="no-tables" style="grid-column: 1 / -1;">No tables available.</p>';
        return;
    }

    const tableGroups = groupTablesByCategory(tables);

    const customTitles = {
        'MEMBER': 'Members',
        'HOLE': 'Course Holes',
        'TEE_TIME': 'Manage Tee Times',
        'EMPLOYEE': 'Employees',
        'GOLF_COURSE': 'Golf Course Details',
        'PLAN_DISCOUNT': 'Plan Discounts'
    };

    let html = '';
    for (const category in tableGroups) {
        if (tableGroups[category].length > 0) {
            html += tableGroups[category].map(table => {
                const friendlyTitle = customTitles[table.toUpperCase()] || formatTableName(table);
                return `
                    <div class="table-card dynamic-card" data-table="${table}" style="cursor: pointer;">
                        <div class="card-icon"><i class="fas fa-${getIcon(table)}"></i></div>
                        <div class="card-details">
                            <h4>${friendlyTitle}</h4>
                        </div>
                    </div>`;
            }).join('');
        }
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
function getIcon(tableName) {
    tableName = tableName.toLowerCase();
    if (tableName.includes('member')) return 'users';
    if (tableName.includes('course')) return 'golf-ball';
    if (tableName.includes('hole')) return 'golf-ball';
    if (tableName.includes('tee_time')) return 'calendar-alt';
    if (tableName.includes('equipment') || tableName.includes('rental')) return 'tools';
    if (tableName.includes('employee')) return 'user-tie';
    if (tableName.includes('manage')) return 'tasks';
    if (tableName.includes('plan')) return 'clipboard-list';
    return 'table'; // default fallback
}
function formatCategoryName(category) { return category.charAt(0).toUpperCase() + category.slice(1) + ' Tables'; }


async function loadTableData(tableName) {
    currentTableStructure = []; currentPrimaryKeyField = '';
    try {
        const selectedTableElement = document.getElementById('selected-table');
        if (selectedTableElement && tableName) { selectedTableElement.textContent = formatTableName(tableName); }
        const addRecordBtn = document.getElementById('add-record-btn');
        if (addRecordBtn) {
        const t = tableName.toUpperCase();
        if ( noAddTables.includes(t) ) {
            // fully hide and disable
            addRecordBtn.style.display  = 'none';
            addRecordBtn.disabled       = true;
        } else {
            // show and enable
            addRecordBtn.style.display  = '';
            addRecordBtn.disabled       = false;
        }
        }
        window.currentTable = tableName;
        const dataTable = document.getElementById('data-table'); if (!dataTable) return; const thead = dataTable.querySelector('thead tr'); const tbody = dataTable.querySelector('tbody'); 
        if (!thead || !tbody) return; thead.innerHTML = '<th>Loading...</th>'; tbody.innerHTML = '<tr><td colspan="1" class="loading-cell"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';
        const [structureResponse, dataResponse] = await Promise.all([ authenticatedFetch(`${API_BASE_URL}/tables/${tableName}/structure`), authenticatedFetch(`${API_BASE_URL}/tables/${tableName}`)]); if (!structureResponse.ok || !dataResponse.ok) throw new Error('Failed fetch'); const structure = await structureResponse.json(); const tableData = await dataResponse.json(); currentTableStructure = structure; const pkCol = structure.find(c => c.Key === 'PRI'); currentPrimaryKeyField = pkCol ? pkCol.Field : (structure[0]?.Field || ''); if (!currentPrimaryKeyField) console.warn(`PK missing ${tableName}`); renderTableData(structure, tableData);
    } catch (error) { console.error('Err load table:', error); showNotification('Failed load table', 'error'); const tbody = document.querySelector('#data-table tbody'); if (tbody) tbody.innerHTML = `<tr><td colspan="1" class="error-table">Error loading data.</td></tr>`; }
}

/**
 * Render table data to the DOM
 * CORRECTED: Show Actions column for Employees on MEMBER table for Assign Plan button.
 * Hide Actions for Admins on MEMBER table and for all on EMPLOYEE table.
 */
function renderTableData(structure, tableData) {
    const dataTable = document.getElementById('data-table'); if (!dataTable) return;
    const thead = dataTable.querySelector('thead tr'); const tbody = dataTable.querySelector('tbody'); if (!thead || !tbody) return;

    const currentTableUpper = window.currentTable?.toUpperCase();
    const isMemberTable = currentTableUpper === 'MEMBER';
    const isEmployeeTable = currentTableUpper === 'EMPLOYEE';

    // --- Determine if the Actions column should be shown AT ALL for this view ---
    // Show Actions IF:
    // - It's the Member table AND the current user is an Employee
    // - OR It's NOT the Member table AND NOT the Employee table
    const showActionsColumn = (isMemberTable && currentUser?.role === 'employee') || (!isMemberTable && !isEmployeeTable);
    // ---

    console.log(`--- Rendering Table ---`);
    console.log(`Current Table (Upper): ${currentTableUpper}`);
    console.log(`Current User Role: ${currentUser?.role}`);
    console.log(`Show Actions Column? ${showActionsColumn}`);

    // Filter structure based on current table (e.g., hide Handicap for Member)
    let columnsToRender = structure;
    if (isMemberTable) {
        const hiddenMemberColumns = ['HANDICAP']; // Define columns to hide for MEMBER table view
        columnsToRender = structure.filter(col =>
            !hiddenMemberColumns.includes(col.Field.toUpperCase())
        );
    }
    // Add other column filtering if needed...

    // Determine column count for colspan
    const columnCount = columnsToRender.length + (showActionsColumn ? 1 : 0);

    // Render headers with friendly names
    const friendlyColumnNames = { USER_ID:'User ID', MEMBER_PLAN_ID:'Plan', LNAME:'Last Name', FNAME:'First Name', EMAIL:'Email Address', PHONE_NUMBER:'Phone Number', HANDICAP:'Hcp', JOINDATE:'Joined', TEE_TIME_ID:'TT ID', EQUIPMENT_ID:'Eq ID', RENTAL_DATE:'Rented', RETURN_DATE:'Due', RETURNED:'Ret?', PLAN_ID:'Plan ID', PLAN_TYPE:'Plan Type', FEES:'Fees', AVAILABILITY:'Avail?', COURSE_ID:'Course ID', HOLE_ID:'Hole ID', EMP_FNAME:'First Name', EMP_LNAME:'Last Name', ROLE:'App Role', RENTAL_DISCOUNT:'Discount', DISTANCE_TO_PIN:'Distance', AVAILABLE_SLOTS:'Slots', HIREDATE:'Hired', COURSE_NAME:'Course Name', RENTAL_ID:'Rental ID', RENTAL_FEE:'Fee', PLAN_START_DATE:'Start', PLAN_END_DATE:'End' };
    thead.innerHTML = columnsToRender.map(col =>
        `<th>${friendlyColumnNames[col.Field.toUpperCase()] || col.Field}</th>`
    ).join('') + (showActionsColumn ? '<th>Actions</th>' : ''); // Conditionally add Actions header

    // Render table data rows
    if (tableData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${columnCount}" class="empty-table">No records</td></tr>`;
        return;
    }

    tbody.innerHTML = tableData.map(row => {
         const recordId = currentPrimaryKeyField ? row[currentPrimaryKeyField] : null;
         const actionsDisabled = !recordId ? 'disabled' : '';
         let actionsCellHTML = ''; // Start empty

         // Generate buttons and the actions cell ONLY if showActionsColumn is true
         if (showActionsColumn) {
             let actionButtons = []; // Array for buttons in this specific cell

             // EDIT Button Logic (Show unless disallowed table OR it's Admin-only table and user isn't admin)
             let showEditButton = !noEditTables.includes(currentTableUpper);
             if (showEditButton && (currentTableUpper === 'GOLF_COURSE' || currentTableUpper === 'HOLE' || currentTableUpper === 'TEE_TIME')) {
                 if (!isAdmin()) { showEditButton = false; }
             }
             if (showEditButton) { actionButtons.push(`<button class="btn-edit" ${actionsDisabled} title="Edit"><i class="fas fa-edit"></i></button>`); }

             // ASSIGN PLAN Button (Only for MEMBER table and Employee role)
             // This check is now technically redundant because showActionsColumn is already false
             // for Admins viewing MEMBER, but keeping it adds clarity.
             if (isMemberTable && currentUser?.role === 'employee') {
                const memberName = `${row.Fname || ''} ${row.Lname || ''}`.trim();
                 actionButtons.push(`<button class="btn-assign-plan" data-userid="${recordId}" data-name="${escapeHtml(memberName)}" title="Assign/Change Plan"><i class="fas fa-id-card"></i></button>`);
             }

             // DELETE Button Logic
             if (!noDeleteTables.includes(currentTableUpper)) {
                actionButtons.push(`<button class="btn-delete" ${actionsDisabled} title="Delete"><i class="fas fa-trash"></i></button>`);
             }

             // Create the table cell string
             actionsCellHTML = `<td class="actions">${actionButtons.join('&nbsp;')}</td>`;
         }
         // If showActionsColumn is false, actionsCellHTML remains empty ""

         // Render the row
         return `<tr ${recordId ? `data-id="${recordId}"` : ''}>
                    ${columnsToRender.map(col => `<td>${escapeHtml(formatCellValue(row[col.Field]))}</td>`).join('')}
                    ${actionsCellHTML}
                 </tr>`;
    }).join('');

    // Attach listeners (Will only find buttons that were actually rendered)
    tbody.querySelectorAll('.btn-edit').forEach(btn => { btn.addEventListener('click', function (e) { e.stopPropagation(); const row = this.closest('tr'); if (row && row.dataset.id) editRecord(row.dataset.id); }); });
    tbody.querySelectorAll('.btn-delete').forEach(btn => { btn.addEventListener('click', function (e) { e.stopPropagation(); const row = this.closest('tr'); if (row && row.dataset.id) deleteRecord(row.dataset.id); }); });
    tbody.querySelectorAll('.btn-assign-plan').forEach(btn => { btn.addEventListener('click', function (e) { e.stopPropagation(); const userId = this.dataset.userid; const userName = this.dataset.name; if (userId) { openAssignPlanModal(userId, userName); } else { console.error("Missing user ID"); showNotification("Cannot assign plan: User ID missing.","error"); }}); });
}


function formatCellValue(value) { if (value === null || value === undefined) return '-'; const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z?$/; if (typeof value === 'string' && dateRegex.test(value)) { const date = new Date(value); if (!isNaN(date.getTime())) return date.toLocaleDateString(); } if (typeof value === 'boolean') return value ? 'Yes' : 'No'; if (typeof value === 'object' && value !== null && value.type === 'Buffer' && Array.isArray(value.data)) return value.data[0] === 1 ? 'Yes' : 'No'; return value.toString(); }

// ---> UPDATED: loadAndRenderUsers to add Actions column/button <---
async function loadAndRenderUsers() {
    const container = document.getElementById('user-list-container');
    const table = document.getElementById('user-list-table');
    const tableHead = table?.querySelector('thead tr');
    const tableBody = table?.querySelector('tbody');
    const loadingIndicator = container?.querySelector('.loading');
    if (!container || !table || !tableHead || !tableBody || !loadingIndicator) { console.error('User management view elements missing.'); return; }

    loadingIndicator.style.display = 'block';
    tableBody.innerHTML = '';

    // Add Actions header
    tableHead.innerHTML = `<th>User ID</th><th>Username</th><th>Role</th><th>Created At</th><th>Actions</th>`;

    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/admin/users`);
        if (!response.ok) { const d = await response.json(); throw new Error(d.error || 'Server error'); }
        const users = await response.json();

        if (users.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" class="empty-table">No users found.</td></tr>`; // Incremented colspan
        } else {
            const currentUserId = currentUser?.userId; // Get current admin's ID

            tableBody.innerHTML = users.map(user => {
                // Disable delete button for the currently logged-in admin
                const isSelf = user.user_id === currentUserId;
                const deleteDisabled = isSelf ? 'disabled' : '';
                const deleteTitle = isSelf ? 'Cannot delete yourself' : 'Delete User';

                return `
                    <tr data-userid="${user.user_id}">
                        <td>${user.user_id}</td>
                        <td>${escapeHtml(user.username)}</td>
                        <td>${escapeHtml(user.role)}</td>
                        <td>${new Date(user.created_at).toLocaleString()}</td>
                        <td class="actions">
                            <button class="btn-delete-user" data-userid="${user.user_id}" data-username="${escapeHtml(user.username)}" title="${deleteTitle}" ${deleteDisabled}>
                                <i class="fas fa-trash"></i>
                            </button>
                            </td>
                    </tr>`;
            }).join('');

            // Attach listener attachment for delete buttons
            tableBody.querySelectorAll('.btn-delete-user').forEach(btn => {
                if (!btn.disabled) { // Only attach if not disabled
                    btn.addEventListener('click', function() {
                        const userIdToDelete = this.dataset.userid;
                        const usernameToDelete = this.dataset.username;
                        deleteUser(userIdToDelete, usernameToDelete); // Call delete handler below
                    });
                }
            });
        }
    } catch (error) { console.error('Err load users:', error); showNotification(`Failed load users: ${error.message}`, 'error'); tableBody.innerHTML = `<tr><td colspan="5" class="error-table">Failed load users.</td></tr>`; } // Incremented colspan
    finally { loadingIndicator.style.display = 'none'; }
}

// ---> ADDED: Function to handle user deletion <---
/**
 * Deletes a user from the 'users' table after confirmation.
 * @param {string} userIdToDelete
 * @param {string} usernameToDelete
 */
async function deleteUser(userIdToDelete, usernameToDelete) {
    if (!userIdToDelete || !usernameToDelete) {
        showNotification("Cannot delete user: ID or username missing.", "error");
        return;
    }
    // Provide more context in confirmation
    if (!confirm(`Are you sure you want to permanently delete user '${usernameToDelete}' (ID: ${userIdToDelete})?\n\nThis will also delete their associated profile and cannot be undone.`)) {
        return; // User cancelled
    }

    console.log(`Attempting to delete user ${userIdToDelete}`);
    try {
        // Call the specific admin route for deleting users
        const url = `${API_BASE_URL}/admin/users/${userIdToDelete}`;
        const response = await authenticatedFetch(url, {
            method: 'DELETE'
        });

        // Check for 204 No Content or other success codes
        if (response.status === 204 || response.ok) {
            showNotification(`User '${usernameToDelete}' deleted successfully!`, 'success');
            loadAndRenderUsers(); // Refresh the user list view
        } else {
            const result = await response.json().catch(()=>({ error: `Deletion failed with status ${response.status}` }));
            throw new Error(result.error || `Failed to delete user.`);
        }
    } catch (error) {
        console.error("Error deleting user:", error);
        showNotification(`Error deleting user: ${error.message}`, 'error');
    }
}
// ----------------------------------------------------

function escapeHtml(unsafe) { if (unsafe === null || unsafe === undefined) return ''; return unsafe.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }

// --- MODAL AND CRUD FUNCTIONS ---

// ---> REPLACED openAddRecordModal with combined openRecordModal <---
async function openRecordModal(recordId = null) {
    const isEditing = recordId !== null;
    const tableName = window.currentTable; if (!tableName) { showNotification("No table selected.", "warning"); return; }
    let structure = currentTableStructure; if (!structure || structure.length === 0) { try { const r=await authenticatedFetch(`${API_BASE_URL}/tables/${tableName}/structure`); if(!r.ok)throw new Error('Failed fetch structure'); structure=await r.json(); currentTableStructure=structure; const p=structure.find(c=>c.Key==='PRI'); currentPrimaryKeyField=p?p.Field:(structure[0]?.Field||''); } catch(e){showNotification(e.message,"error");return;} } if(!currentPrimaryKeyField&&isEditing){showNotification("Cannot edit: PK unknown.","error");return;}
    let currentData = null; if(isEditing){ try { const url=`${API_BASE_URL}/tables/${tableName}/${recordId}?primaryKey=${encodeURIComponent(currentPrimaryKeyField)}`; const r=await authenticatedFetch(url); if(!r.ok){const d=await r.json().catch(()=>({})); throw new Error(d.error||`Record fetch failed`);} currentData=await r.json(); } catch(e){showNotification(e.message,"error");return;} }
    const modal=document.getElementById('add-record-modal'); const modalTitle=document.getElementById('modal-title'); const form=document.getElementById('add-record-form'); const submitButton=document.getElementById('submit-record'); if (!modal||!modalTitle||!form||!submitButton){console.error("Add/Edit modal elements missing."); return;}
    modalTitle.textContent=`${isEditing?'Edit':'Add New'} Record in ${formatTableName(tableName)}`; submitButton.textContent=isEditing?'Update Record':'Submit'; form.innerHTML=''; form.dataset.editingId=isEditing?recordId:'';
    structure.forEach(col => { const isPK=col.Field===currentPrimaryKeyField; const isAI=col.Extra?.toLowerCase().includes('auto_increment'); if(isPK&&isAI&&!isEditing) return; const fg=document.createElement('div'); fg.className='form-group'; const l=document.createElement('label'); l.htmlFor=`record-${col.Field}`; l.textContent=col.Field; if(col.Null==='NO'&&!isAI&&!isPK)l.textContent+=' *'; fg.appendChild(l); let i; const fT=col.Type.toLowerCase(); if(fT.includes('text')){i=document.createElement('textarea');i.rows=3;}else if(fT.includes('date')){i=document.createElement('input');i.type='date';}else if(fT.includes('time')){i=document.createElement('input');i.type='time';i.step='1';}else if(fT.includes('datetime')||fT.includes('timestamp')){i=document.createElement('input');i.type='datetime-local';i.step='1';}else if(fT.includes('int')||fT.includes('decimal')||fT.includes('float')||fT.includes('double')){i=document.createElement('input');i.type='number';if(!fT.includes('int'))i.step='any';}else if(fT.includes('enum')||fT.includes('boolean')||fT.includes('tinyint(1)')){i=document.createElement('select'); const dO=document.createElement('option'); dO.value=""; dO.textContent="-- Select --"; i.appendChild(dO); if(fT.includes('boolean')||fT.includes('tinyint(1)')){const oT=document.createElement('option');oT.value="1";oT.textContent="Yes";i.appendChild(oT); const oF=document.createElement('option');oF.value="0";oF.textContent="No";i.appendChild(oF);}else{const m=fT.match(/enum\((.*)\)/);if(m&&m[1]){m[1].split(',').map(v=>v.trim().replace(/^'|'$/g,'')).forEach(val=>{const o=document.createElement('option');o.value=val;o.textContent=val;i.appendChild(o);});}else{i=document.createElement('input');i.type='text';}}}else{i=document.createElement('input');i.type='text';} i.id=`record-${col.Field}`; i.name=col.Field; if(isEditing&&currentData&&currentData[col.Field]!==null&&currentData[col.Field]!==undefined){let v=currentData[col.Field]; if((i.type==='date')&&v){try{v=new Date(v).toISOString().split('T')[0];}catch(e){}}else if((i.type==='datetime-local')&&v){try{const dt=new Date(v);v=dt.getFullYear()+'-'+('0'+(dt.getMonth()+1)).slice(-2)+'-'+('0'+dt.getDate()).slice(-2)+'T'+('0'+dt.getHours()).slice(-2)+':'+('0'+dt.getMinutes()).slice(-2)+':'+('0'+dt.getSeconds()).slice(-2);}catch(e){}}else if(i.type==='time'&&v){v=String(v).substring(0,8);} i.value=v;} if(isPK&&isEditing){i.readOnly=true;i.style.backgroundColor="#e9ecef";} fg.appendChild(i); form.appendChild(fg); });
    modal.style.display='block';
}

// ---> REPLACED handleAddRecordSubmit with combined handleModalFormSubmit <---
async function handleModalFormSubmit() {
    // ---> ADDED Log: Check if function is called <---
    console.log("handleModalFormSubmit called!");

    const tableName = window.currentTable; const form = document.getElementById('add-record-form'); if (!tableName || !form) { showNotification("Cannot submit.", "error"); return; }
    const editingId = form.dataset.editingId; const isEditing = !!editingId; 

    // ---> ADDED Log: Check if edit mode is detected <---
    console.log(`handleModalFormSubmit: isEditing = ${isEditing}, editingId = ${editingId}`);
    
    const formData = new FormData(form); const dataToSubmit = {}; let isValid = true; let missing = [];

    
    for(const [key, value] of formData.entries()){const field=currentTableStructure.find(c=>c.Field===key); if(!field)continue; if(isEditing&&key===currentPrimaryKeyField)continue; const allowE=field.Null==='YES'; const isAI=field.Extra?.toLowerCase().includes('auto_increment'); if(value===''&&!allowE&&!isAI&&!(isEditing&&key===currentPrimaryKeyField)){isValid=false; missing.push(key);}else if(value===''&&allowE){dataToSubmit[key]=null;}else if(value!==''){dataToSubmit[key]=value;}}
    if(!isValid){showNotification(`Fill required: ${missing.join(', ')}`, "error"); return;} if(Object.keys(dataToSubmit).length===0){showNotification("No data/changes.", "warning"); if (isEditing) document.getElementById('add-record-modal').style.display='none'; return;}
    const url = isEditing ? `${API_BASE_URL}/tables/${tableName}/${editingId}?primaryKey=${encodeURIComponent(currentPrimaryKeyField)}` : `${API_BASE_URL}/tables/${tableName}`; const method = isEditing ? 'PUT' : 'POST';
    console.log(`Submitting (${method}) to ${url}:`, dataToSubmit);
    try{const res=await authenticatedFetch(url,{method:method, headers:{'Content-Type':'application/json'}, body:JSON.stringify(dataToSubmit)}); const result=await res.json(); if(!res.ok){throw new Error(result.error||`Server error ${res.status}`);} showNotification(`Record ${isEditing?'updated':'added'}!`,'success'); document.getElementById('add-record-modal').style.display='none'; loadTableData(tableName);}catch(err){console.error(`Err ${isEditing?'updating':'adding'}:`, err); showNotification(`Error: ${err.message}`,'error');}
}

async function deleteRecord(recordId) {
    const tableName = window.currentTable; const pkField = currentPrimaryKeyField; if (!tableName || !recordId || !pkField) { showNotification("Cannot delete: context missing.", "error"); return; } if (!confirm(`DELETE record where ${pkField}=${recordId} from ${formatTableName(tableName)}?`)) return;
    try { const url = `${API_BASE_URL}/tables/${tableName}/${recordId}?primaryKey=${encodeURIComponent(pkField)}`; const response = await authenticatedFetch(url, { method: 'DELETE' }); const result = await response.json(); if (!response.ok) { throw new Error(result.error || `Server error ${response.status}`); } showNotification('Deleted!', 'success'); loadTableData(tableName); } catch (error) { console.error("Error deleting:", error); showNotification(`Error deleting: ${error.message}`, 'error'); }
}

// ---> MODIFIED: editRecord now calls openRecordModal after permission check <---
function editRecord(recordId) {
    console.log('Edit button for record:', recordId, 'in table', window.currentTable);
    const tableNameUpper = window.currentTable?.toUpperCase();
    // Check if generally editable
    let canEdit = !noEditTables.includes(tableNameUpper);
    // Apply specific admin-only rule
    if (canEdit && (tableNameUpper === 'GOLF_COURSE' || tableNameUpper === 'HOLE' || tableNameUpper === 'TEE_TIME')) {
        if (!isAdmin()) { // Use imported isAdmin()
            canEdit = false;
        }
    }
    if (!canEdit) {
         showNotification(`Editing for ${formatTableName(window.currentTable)} requires different permissions or is handled elsewhere.`, "warning");
         return;
    }
    openRecordModal(recordId); // Open the modal in edit mode
}
// ------------------------------------------------------------------------

async function handleAddAdminSubmit() {
    const usernameInput = document.getElementById('add-admin-username'); const passwordInput = document.getElementById('add-admin-password'); const errorDiv = document.getElementById('add-admin-error'); errorDiv.style.display = 'none'; const username = usernameInput.value.trim(); const password = passwordInput.value; if (!username || !password) { errorDiv.textContent = 'Username/password required.'; errorDiv.style.display = 'block'; return; } if (password.length < 4) { errorDiv.textContent = 'Password min 4 chars.'; errorDiv.style.display = 'block'; return; }
    try { const response = await authenticatedFetch(`${API_BASE_URL}/admin/users`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) }); const result = await response.json(); if (!response.ok) { throw new Error(result.error || `Failed add admin`); } showNotification(result.message || 'Admin created!', 'success'); document.getElementById('add-admin-modal').style.display = 'none'; loadAndRenderUsers(); } catch (error) { console.error("Error adding admin:", error); errorDiv.textContent = error.message; errorDiv.style.display = 'block'; }
}

async function handleAddEmployeeSubmit() {
    const form = document.getElementById('add-employee-form'); const errorDiv = document.getElementById('add-employee-error'); if (!form || !errorDiv) { console.error("Add employee form missing"); return; } errorDiv.style.display = 'none'; const formData = new FormData(form); const payload = {}; let isValid = true; payload.username = formData.get('username')?.trim(); payload.password = formData.get('password'); payload.fname = formData.get('fname')?.trim(); payload.lname = formData.get('lname')?.trim(); payload.role = formData.get('role')?.trim(); payload.email = formData.get('email')?.trim() || null; payload.phone = formData.get('phone')?.trim() || null; if (!payload.username || !payload.password || !payload.fname || !payload.lname || !payload.role) { errorDiv.textContent = 'Username, password, names, app role required.'; isValid = false; } else if (payload.password.length < 4) { errorDiv.textContent = 'Password min 4 chars.'; isValid = false; } if (!isValid) { errorDiv.style.display = 'block'; return; }
    try { const response = await authenticatedFetch(`${API_BASE_URL}/admin/employees`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); const result = await response.json(); if (!response.ok) { throw new Error(result.error || `Failed add employee`); } showNotification(result.message || 'Employee created!', 'success'); document.getElementById('add-employee-modal').style.display = 'none'; loadAndRenderUsers(); } catch (error) { console.error("Error adding employee:", error); errorDiv.textContent = error.message; errorDiv.style.display = 'block'; }
}

// ---> ADD Assign Plan Modal Functions <---

/**
 * Opens the modal to assign/change a membership plan for a user.
 * @param {string} userId - The user_id of the member.
 * @param {string} userName - The name of the member (for display).
 */
async function openAssignPlanModal(userId, userName) {
    const modal = document.getElementById('assign-plan-modal');
    const memberInfoEl = document.getElementById('assign-plan-member-info');
    const planSelect = document.getElementById('assign-plan-select');
    const errorDiv = document.getElementById('assign-plan-error');
    if (!modal || !memberInfoEl || !planSelect || !errorDiv) {
        console.error("Assign plan modal elements missing!");
        showNotification("Cannot open assign plan modal: UI elements missing.", "error");
        return;
    }

    console.log(`Opening assign plan modal for User ID: ${userId}, Name: ${userName}`);

    // Store user ID on the modal for the submit handler
    modal.dataset.userId = userId;
    memberInfoEl.textContent = `Assign plan for: ${userName || 'Member'} (ID: ${userId})`;
    errorDiv.style.display = 'none';
    planSelect.innerHTML = '<option value="">-- Loading Plans --</option>';
    planSelect.disabled = true;

    modal.style.display = 'block'; // Show modal

    try {
        // Fetch available plans using the /api/staff/plans endpoint
        const response = await authenticatedFetch(`${API_BASE_URL}/staff/plans`);
        if (!response.ok) {
            const errData = await response.json().catch(()=>({}));
            throw new Error(errData.error || 'Failed to load membership plans');
        }
        const plans = await response.json();

        // Populate dropdown
        planSelect.innerHTML = ''; // Clear loading message
        // Add a "None" option for removing a plan
        const noneOption = document.createElement('option');
        noneOption.value = ""; // Empty value will be treated as NULL by the submit handler
        noneOption.textContent = "-- No Plan --";
        planSelect.appendChild(noneOption);

        if(plans && plans.length > 0) {
            plans.forEach(plan => {
                const option = document.createElement('option');
                option.value = plan.Plan_id;
                option.textContent = `${plan.Plan_type || plan.Plan_id} ($${plan.Fees !== null ? parseFloat(plan.Fees).toFixed(2) : 'N/A'})`;
                planSelect.appendChild(option);
            });
            planSelect.disabled = false; // Enable dropdown only if plans loaded
        } else {
             planSelect.appendChild(new Option("-- No Plans Available --", ""));
             planSelect.disabled = true; // Keep disabled if no actual plans
        }
        // TODO: Add logic here to fetch the member's current plan and set planSelect.value

    } catch (error) {
        console.error("Error fetching plans for modal:", error);
        errorDiv.textContent = `Error loading plans: ${error.message}`;
        errorDiv.style.display = 'block';
        planSelect.innerHTML = '<option value="">-- Error --</option>';
        planSelect.disabled = true;
    }
}

/**
 * Handles the submission of the Assign Plan modal.
 */
async function handleAssignPlanSubmit() {
    const modal = document.getElementById('assign-plan-modal');
    const userId = modal?.dataset.userId; // Retrieve stored userId from modal
    const planSelect = document.getElementById('assign-plan-select');
    const errorDiv = document.getElementById('assign-plan-error');
    if (!userId || !planSelect || !modal || !errorDiv) {
        console.error("Assign plan modal submit error: elements or userId missing");
        return;
    }

    const selectedPlanId = planSelect.value; // This will be "" if "-- No Plan --" is selected
    errorDiv.style.display = 'none';

    console.log(`Assigning Plan ID: '${selectedPlanId || 'NULL'}' to User ID: ${userId}`);

    try {
        // Call the NEW backend endpoint to update the plan
        const response = await authenticatedFetch(`${API_BASE_URL}/staff/members/${userId}/plan`, { // Use PUT
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ Plan_id: selectedPlanId === "" ? null : selectedPlanId }) // Send null if "" selected
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || `Failed to assign plan (Status: ${response.status})`);
        }

        showNotification(result.message || 'Plan assigned successfully!', 'success');
        modal.style.display = 'none'; // Close modal
        // Refresh the MEMBER table data if currently viewing it
        if (window.currentTable && window.currentTable.toUpperCase() === 'MEMBER') {
            loadTableData('MEMBER');
        }

    } catch (error) {
        console.error("Error assigning plan:", error);
        errorDiv.textContent = `Error: ${error.message}`;
        errorDiv.style.display = 'block';
    }
}
// -------------------------------------



// ---> UPDATED Exports <---
export {
    fetchTablesAndPopulateDashboard, loadTableData, loadAndRenderUsers,
    openRecordModal, handleModalFormSubmit, handleAddAdminSubmit,
    handleAddEmployeeSubmit, handleAssignPlanSubmit
    // deleteUser is internal, called by listener added in loadAndRenderUsers
};