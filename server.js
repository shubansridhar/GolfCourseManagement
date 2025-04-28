// DBPROJ/server.js

require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3001;

// Core Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// DB Pool
const dbPool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME, // Make sure this matches the DB you are using!
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000
}).promise();

dbPool.getConnection()
    .then(connection => { console.log('Successfully connected to the database pool.'); connection.release(); })
    .catch(err => { console.error('!!! DATABASE POOL CONNECTION FAILED !!! Error:', err.message); });

// Custom Middleware Definitions
const checkDbConnection = async (req, res, next) => {
    try { const c = await dbPool.getConnection(); c.release(); next(); } catch (e) { if (req.path.startsWith('/api/')) return res.status(503).json({ error: 'DB unavailable' }); else next(); }
};
const authenticateToken = (req, res, next) => {
    const h = req.headers['authorization']; const t = h && h.split(' ')[1]; if (!t) return res.status(401).json({ error: 'No token' }); jwt.verify(t, process.env.JWT_SECRET, (err, p) => { if (err) return res.status(403).json({ error: 'Invalid token' }); req.user = p; next(); });
};

// Apply Custom Middleware
app.use('/api', checkDbConnection);
app.use('/api/tables', authenticateToken);
app.use('/api/admin', authenticateToken); // Protects all /api/admin/*
app.use('/api/statistics', authenticateToken);
app.use('/api/member', authenticateToken);
app.use('/api/staff', authenticateToken); // Protect staff actions
// === API Route Definitions ===

// --- Authentication Routes ---
const saltRounds = 10;

// POST /api/auth/signup (Allows FIRST admin, otherwise ONLY Member)
app.post('/api/auth/signup', async (req, res, next) => {
    const { username, password, role, fname, lname, email, phone } = req.body;

    if (!username || !password || !role) return res.status(400).json({ error: 'Username, password, role required.' });
    if (password.length < 4) return res.status(400).json({ error: 'Password min 4 chars.' });

    try {
        const [adminRows] = await dbPool.query('SELECT COUNT(*) as adminCount FROM users WHERE role = ?', ['admin']);
        const adminExists = adminRows[0].adminCount > 0;

        // Role Validation: Only 'member' allowed, unless no admin exists
        if (role === 'admin') {
            if (adminExists) return res.status(403).json({ error: 'Admin already exists.' });
        } else if (role !== 'member') { // Only allow 'member' role here
            return res.status(400).json({ error: 'Invalid role for signup. Employees must be added by admin.' });
        }

        const [userRows] = await dbPool.query('SELECT user_id FROM users WHERE username = ?', [username]);
        if (userRows.length > 0) return res.status(409).json({ error: 'Username taken.' });

        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const connection = await dbPool.getConnection();
        await connection.beginTransaction();
        try {
            const [insertUserResult] = await connection.query('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', [username, hashedPassword, role]);
            const newUserId = insertUserResult.insertId;
            if (role === 'member') {
                if (!fname || !lname) throw new Error('First/Last name required for member signup.');
                await connection.query('INSERT INTO MEMBER (user_id, Fname, Lname, Email, Phone_number, Member_plan_id) VALUES (?, ?, ?, ?, ?, ?)', [newUserId, fname, lname, email || null, phone || null, null]);
                console.log(`Created MEMBER record for user_id ${newUserId}`);
            }
            await connection.commit();
            connection.release();
            res.status(201).json({ message: `User '${username}' created as ${role}!` });
        } catch (err) { await connection.rollback(); connection.release(); console.error("Signup TX error:", err); if (err.message.includes('First/Last name')) return res.status(400).json({ error: err.message }); next(err); }
    } catch (error) { next(error); }
});

// POST /api/auth/login (Unchanged)
app.post('/api/auth/login', async (req, res, next) => {
    const { username, password } = req.body; if (!username || !password) return res.status(400).json({ error: 'Username/password required.' }); try { const [rows] = await dbPool.query('SELECT user_id, username, password_hash, role FROM users WHERE username = ?', [username]); if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials.' }); const user = rows[0]; const match = await bcrypt.compare(password, user.password_hash); if (!match) return res.status(401).json({ error: 'Invalid credentials.' }); const payload = { userId: user.user_id, username: user.username, role: user.role }; const secret = process.env.JWT_SECRET; if (!secret) { console.error("NO JWT SECRET"); return res.status(500).json({ error: 'Server config error' }); } const token = jwt.sign(payload, secret, { expiresIn: '1h' }); res.status(200).json({ message: 'Login successful!', token: token, username: user.username, role: user.role }); } catch (error) { next(error); }
});

// GET /api/auth/admin-exists (Unchanged)
app.get('/api/auth/admin-exists', async (req, res, next) => {
    try { const [rows] = await dbPool.query('SELECT COUNT(*) as adminCount FROM users WHERE role=?', ['admin']); res.json({ exists: rows[0].adminCount > 0 }); } catch (err) { console.error("Admin check error:", err); res.status(500).json({ exists: true, error: 'Check failed' }); }
});


// --- Admin Routes ---
// GET /api/admin/users (List users - Unchanged)
app.get('/api/admin/users', async (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') { return res.status(403).json({ error: 'Forbidden.' }); } try { const q = 'SELECT user_id, username, role, created_at FROM users ORDER BY user_id'; const [users] = await dbPool.query(q); res.json(users); } catch (err) { next(err); }
});
// POST /api/admin/users (Create Admin by Admin - Unchanged)
app.post('/api/admin/users', async (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') { return res.status(403).json({ error: 'Forbidden.' }); } const { username, password } = req.body; const roleToCreate = 'admin'; if (!username || !password) { return res.status(400).json({ error: 'Username/password required.' }); } if (password.length < 4) { return res.status(400).json({ error: 'Password min 4 chars.' }); } try { const [exist] = await dbPool.query('SELECT user_id FROM users WHERE username = ?', [username]); if (exist.length > 0) { return res.status(409).json({ error: 'Username taken.' }); } const hashed = await bcrypt.hash(password, saltRounds); const [insertRes] = await dbPool.query('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', [username, hashed, roleToCreate]); console.log(`Admin ${req.user.username} created admin ${username}`); res.status(201).json({ message: `Admin '${username}' created.` }); } catch (error) { next(error); }
});

// *** POST /api/admin/employees (Create Employee by Admin - PRESENT) ***
app.post('/api/admin/employees', async (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden: Only admins can add employees.' });
    const { username, password, fname, lname, role: appRole, email, phone } = req.body; const loginRole = 'employee';
    if (!username || !password || !fname || !lname || !appRole) return res.status(400).json({ error: 'Username, password, fname, lname, app role required.' });
    if (password.length < 4) return res.status(400).json({ error: 'Password min 4 chars.' });
    const connection = await dbPool.getConnection(); await connection.beginTransaction();
    try {
        const [existingUser] = await connection.query('SELECT user_id FROM users WHERE username = ?', [username]);
        if (existingUser.length > 0) throw new Error('Username already taken.');
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const [insertUserResult] = await connection.query('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', [username, hashedPassword, loginRole]);
        const newUserId = insertUserResult.insertId;
        await connection.query('INSERT INTO EMPLOYEE (user_id, Emp_fname, Emp_lname, Role, Email, Phone_number) VALUES (?, ?, ?, ?, ?, ?)', [newUserId, fname, lname, appRole, email || null, phone || null]);
        await connection.commit(); connection.release();
        console.log(`Admin ${req.user.username} created employee ${username} (ID: ${newUserId})`);
        res.status(201).json({ message: `Employee '${username}' created!` });
    } catch (error) { await connection.rollback(); connection.release(); console.error("Error creating employee:", error); if (error.message.includes('Username taken')) return res.status(409).json({ error: error.message }); next(error); }
});


// ---> ADDED/VERIFIED: DELETE /api/admin/users/:userId <---
app.delete('/api/admin/users/:userId', async (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden: Only admins can delete users.' });
    const targetUserId = parseInt(req.params.userId, 10);
    const requesterUserId = req.user.userId;
    if (isNaN(targetUserId)) return res.status(400).json({ error: 'Invalid User ID.' });
    if (targetUserId === requesterUserId) return res.status(400).json({ error: 'Cannot delete self.' });

    try {
        const [result] = await dbPool.query('DELETE FROM users WHERE user_id = ?', [targetUserId]);
        if (result.affectedRows === 0) return res.status(404).json({ error: `User ID ${targetUserId} not found.` });
        console.log(`Admin ${req.user.username} deleted user ID: ${targetUserId}`);
        res.status(204).send(); // Success, no content to return
    } catch (error) {
        // Check if it failed because of constraints NOT covered by cascade (shouldn't happen with current schema)
        if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === 'ER_ROW_IS_REFERENCED') {
             console.error(`FK Constraint Error Deleting User ${targetUserId}:`, error.message);
             return res.status(409).json({ error: `Cannot delete user: Still referenced elsewhere.` });
        }
        console.error(`Error deleting user ${targetUserId}:`, error);
        next(error);
    }
});
// ----------------------------------------------------

// 1. MEMBER_TEE_TIME → show member name instead of user_id
app.get('/api/tables/MEMBER_TEE_TIME', authenticateToken, async (req, res, next) => {
  try {
    const [rows] = await dbPool.query(`
      SELECT
        mtt.Tee_time_id          AS Tee_time_id,
        mtt.user_id              AS user_id,
        CONCAT(m.Fname,' ',m.Lname) AS MemberName,
        tt.Date                  AS Date,
        tt.Time                  AS Time,
        tt.Available_slots       AS Available_slots
      FROM MEMBER_TEE_TIME mtt
      JOIN MEMBER m
        ON mtt.user_id = m.user_id
      JOIN TEE_TIME tt
        ON mtt.Tee_time_id = tt.Tee_time_id
    `);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Return a custom “structure” for MEMBER_TEE_TIME so the client will render MemberName
app.get('/api/tables/MEMBER_TEE_TIME/structure', authenticateToken, async (req, res, next) => {
  try {
    // Fetch the real describe info
    const [orig] = await dbPool.query('DESCRIBE `MEMBER_TEE_TIME`');

    // Remove the user_id column (we’ll replace it with MemberName)
    const filtered = orig.filter(col => col.Field !== 'user_id');

    // Prepend our MemberName column
    const custom = [
      { Field: 'MemberName', Type: 'varchar(255)', Null: 'YES', Key: '', Default: null, Extra: '' },
      ...filtered
    ];

    res.json(custom);
  } catch (err) {
    next(err);
  }
});

// 2. EQUIPMENT_RENTAL → show username instead of user_id
app.get('/api/tables/EQUIPMENT_RENTAL', authenticateToken, async (req, res, next) => {
  try {
    const [rows] = await dbPool.query(`
      SELECT
        er.Rental_id             AS Rental_id,
        er.user_id               AS user_id,
        u.username               AS Username,
        er.Equipment_id          AS Equipment_id,
        er.Rental_date           AS Rental_date,
        er.Return_date           AS Return_date,
        er.Returned              AS Returned
      FROM EQUIPMENT_RENTAL er
      JOIN users u
        ON er.user_id = u.user_id
    `);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Custom structure for EQUIPMENT_RENTAL: drop user_id, prepend Username
app.get('/api/tables/EQUIPMENT_RENTAL/structure', authenticateToken, async (req, res, next) => {
  try {
    const [orig] = await dbPool.query('DESCRIBE `EQUIPMENT_RENTAL`');
    // remove the raw user_id column
    const filtered = orig.filter(col => col.Field !== 'user_id');
    // add our Username field in front
    const custom = [
      { Field: 'Username', Type: 'varchar(255)', Null: 'YES', Key: '', Default: null, Extra: '' },
      ...filtered
    ];
    res.json(custom);
  } catch (err) {
    next(err);
  }
});


// 3. MANAGES → show employee name instead of user_id
app.get('/api/tables/MANAGES', authenticateToken, async (req, res, next) => {
  try {
    const [rows] = await dbPool.query(`
      SELECT
        m.Equipment_id           AS Equipment_id,
        m.user_id                AS user_id,
        CONCAT(e.Emp_fname,' ',e.Emp_lname) AS EmployeeName
      FROM MANAGES m
      JOIN EMPLOYEE e
        ON m.user_id = e.user_id
    `);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Custom structure for MANAGES: drop user_id, prepend EmployeeName
app.get('/api/tables/MANAGES/structure', authenticateToken, async (req, res, next) => {
  try {
    const [orig] = await dbPool.query('DESCRIBE `MANAGES`');
    const filtered = orig.filter(col => col.Field !== 'user_id');
    const custom = [
      { Field: 'EmployeeName', Type: 'varchar(255)', Null: 'YES', Key: '', Default: null, Extra: '' },
      ...filtered
    ];
    res.json(custom);
  } catch (err) {
    next(err);
  }
});

// --- Table Data Routes ---
// GET /api/tables, GET /:tableName/structure, GET /:tableName (Unchanged)
app.get('/api/tables', async (req, res, next) => { try { const [r] = await dbPool.query("SHOW TABLES"); const t = r.map(rw => Object.values(rw)[0]).filter(n => n !== 'users'); res.json(t); } catch (err) { next(err); } });
app.get('/api/tables/:tableName/structure', async (req, res, next) => { const tN = req.params.tableName; if (!tN.match(/^[a-zA-Z0-9_]+$/)) return res.status(400).json({ error: 'Invalid name.' }); if (tN.toLowerCase() === 'users') return res.status(403).json({ error: 'Denied.' }); const q = `DESCRIBE \`${tN}\``; try { const [r] = await dbPool.query(q); res.json(r); } catch (err) { if (err.code === 'ER_NO_SUCH_TABLE') return res.status(404).json({ error: `Table '${tN}' not found.` }); next(err); } });
app.get('/api/tables/:tableName', async (req, res, next) => { const tN = req.params.tableName; if (!tN.match(/^[a-zA-Z0-9_]+$/)) return res.status(400).json({ error: 'Invalid name.' }); if (tN.toLowerCase() === 'users') return res.status(403).json({ error: 'Denied.' }); const q = `SELECT * FROM \`${tN}\``; try { const [r] = await dbPool.query(q); res.json(r); } catch (err) { if (err.code === 'ER_NO_SUCH_TABLE') return res.status(404).json({ error: `Table '${tN}' not found.` }); next(err); } });

// ---> ADDED: GET /api/tables/:tableName/:id (Fetch single record) <---
app.get('/api/tables/:tableName/:id', async (req, res, next) => {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'employee')) { return res.status(403).json({ error: 'Forbidden.' }); }
    const { tableName, id } = req.params; const { primaryKey } = req.query;
    if (!tableName.match(/^[a-zA-Z0-9_]+$/)) return res.status(400).json({ error: 'Invalid table name.' });
    if (tableName.toLowerCase() === 'users'||tableName.toLowerCase() === 'manages') return res.status(403).json({ error: 'Denied.' });
    if (!primaryKey || !primaryKey.match(/^[a-zA-Z0-9_]+$/)) return res.status(400).json({ error: 'PK query param required.' });
    if (!id) return res.status(400).json({ error: 'ID required.' });
    const query = `SELECT * FROM \`${tableName}\` WHERE \`${primaryKey}\` = ?`;
    try { const [results] = await dbPool.query(query, [id]); if (results.length === 0) return res.status(404).json({ error: `Record not found.` }); res.json(results[0]); }
    catch (err) { if (err.code === 'ER_NO_SUCH_TABLE') return res.status(404).json({ error: `Table '${tableName}' not found.` }); next(err); }
});

// POST /api/tables/:tableName (Add record - Role check Added)
app.post('/api/tables/:tableName', async (req, res, next) => { if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'employee')) { return res.status(403).json({ error: 'Forbidden' }); } const tN = req.params.tableName; if (!tN.match(/^[a-zA-Z0-9_]+$/)) return res.status(400).json({ error: 'Invalid name.' }); if (tN.toLowerCase() === 'users') return res.status(403).json({ error: 'Denied.' }); const d = req.body; const cD = {}; Object.keys(d).forEach(k => { if (d[k] !== '') cD[k] = d[k]; }); if (Object.keys(cD).length === 0) return res.status(400).json({ error: 'No data.' }); const q = `INSERT INTO \`${tN}\` SET ?`; try { const [r] = await dbPool.query(q, cD); res.status(201).json({ message: 'Inserted', insertId: r.insertId }); } catch (err) { next(err); } });


// ---> ADDED: PUT /api/tables/:tableName/:id (Update record with specific table checks) <---
app.put('/api/tables/:tableName/:id', async (req, res, next) => {
    const { tableName, id } = req.params; const { primaryKey } = req.query; const dataToUpdate = req.body; const userRole = req.user?.role;
    if (!tableName.match(/^[a-zA-Z0-9_]+$/)) return res.status(400).json({ error: 'Invalid table name.' });
    if (tableName.toLowerCase() === 'users'||tableName.toLowerCase() === 'manages') return res.status(403).json({ error: 'Denied.' });
    if (!primaryKey || !primaryKey.match(/^[a-zA-Z0-9_]+$/)) return res.status(400).json({ error: 'PK query param required.' });
    if (!id) return res.status(400).json({ error: 'ID required.' });
    if (!dataToUpdate || Object.keys(dataToUpdate).length === 0) return res.status(400).json({ error: 'No update data.' });

    let authorized = false; const tableUpper = tableName.toUpperCase();
    if (tableUpper === 'GOLF_COURSE' || tableUpper === 'HOLE' || tableUpper === 'TEE_TIME') {
        if (userRole === 'admin') authorized = true; // Admin only for these
    } else { if (userRole === 'admin' || userRole === 'employee') authorized = true; } // Admin or Employee for others
    if (!authorized) return res.status(403).json({ error: `Forbidden: Role (${userRole}) cannot update ${tableName}.` });

    delete dataToUpdate[primaryKey]; // Don't update PK
    if (Object.keys(dataToUpdate).length === 0) return res.status(400).json({ error: 'No valid fields to update.' });

    const query = `UPDATE \`${tableName}\` SET ? WHERE \`${primaryKey}\` = ?`;
    try { const [results] = await dbPool.query(query, [dataToUpdate, id]); if (results.affectedRows === 0) return res.status(404).json({ error: `Record not found or no changes made.` }); if (results.changedRows === 0) return res.json({ message: `Record ${id} found, no changes made.` }); res.json({ message: `Record ${id} updated`, changedRows: results.changedRows }); }
    catch (err) { console.error("Update Error:", err); next(err); }
});



// DELETE /api/tables/:tableName/:id (Delete record - Role check Added)
app.delete('/api/tables/:tableName/:id', async (req, res, next) => { if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'employee')) { return res.status(403).json({ error: 'Forbidden' }); } const tN = req.params.tableName; const id = req.params.id; const pK = req.query.primaryKey; if (!tN.match(/^[a-zA-Z0-9_]+$/)) return res.status(400).json({ error: 'Invalid name.' }); if (tN.toLowerCase() === 'users') return res.status(403).json({ error: 'Denied.' }); if (!pK || !pK.match(/^[a-zA-Z0-9_]+$/)) return res.status(400).json({ error: 'PK required.' }); if (!id) return res.status(400).json({ error: 'ID required.' }); const q = `DELETE FROM \`${tN}\` WHERE \`${pK}\` = ?`; try { const [r] = await dbPool.query(q, [id]); if (r.affectedRows === 0) return res.status(404).json({ error: `Record ${id} not found.` }); res.json({ message: 'Deleted', affectedRows: r.affectedRows }); } catch (err) { if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') { return res.status(409).json({ error: 'Cannot delete: Record referenced.' }); } next(err); } });


// --- Statistics Route --- (Query Updated)
app.get('/api/statistics', async (req, res, next) => {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'employee')) { return res.status(403).json({ error: 'Forbidden: Admin/Employee only.' }); }
    try {
        // Compute safe table counts for known tables
        const tableList = ['GOLF_COURSE', 'HOLE', 'MEMBERSHIP_PLAN', 'PLAN_DISCOUNT', 'EQUIPMENT_TYPE', 'EQUIPMENT', 'TEE_TIME', 'MEMBER', 'EMPLOYEE', 'MEMBER_TEE_TIME', 'MANAGES', 'EQUIPMENT_RENTAL'];
        const tableCounts = {};
        for (const t of tableList) {
            try {
                const [c] = await dbPool.query(`SELECT COUNT(*) as count FROM \`${t}\``);
                tableCounts[t] = c[0].count;
            } catch (err) {
                // skip missing or inaccessible table
            }
        }

        // Membership counts by plan type
        const [membersByPlan] = await dbPool.query(
            `SELECT mp.Plan_type, COUNT(*) as count
             FROM MEMBER m
             JOIN MEMBERSHIP_PLAN mp
               ON m.Member_plan_id = mp.Plan_id
             GROUP BY mp.Plan_type`
        );

        // Tee time status counts
        const [teeTimeStatus] = await dbPool.query(
            `SELECT Status, COUNT(*) as count
             FROM TEE_TIME
             GROUP BY Status`
        );

        // Equipment availability counts
        const [equipmentAvailability] = await dbPool.query(
            `SELECT et.Type,
                    SUM(CASE WHEN e.Availability = TRUE THEN 1 ELSE 0 END) as available,
                    COUNT(e.Equipment_id) as total
             FROM EQUIPMENT e
             JOIN EQUIPMENT_TYPE et
               ON e.Type = et.Type
             GROUP BY et.Type`
        );

        res.json({ tableCounts, membersByPlan, teeTimeStatus, equipmentAvailability });
    } catch (error) { console.error("Stats Err:", error); next(error); }
});


// --- Member API Routes (Updated for NEW schema) ---
// --- Member API Routes (Updated for NEW schema) ---

// GET /api/member/profile

app.get('/api/member/profile', authenticateToken, async (req, res, next) => {

    if (req.user.role !== 'member') {
    
    return res.status(403).json({ error: 'Access forbidden. Member role required.' });
    
    }
    
    const userId = req.user.userId;
    
    try {
    
    const [[profile]] = await dbPool.query(`
    
    SELECT
    
    m.user_id AS userId,
    
    m.Fname AS firstName,
    
    m.Lname AS lastName,
    
    m.Email AS email,
    
    m.Phone_number AS phone,
    
    u.created_at AS joinDate,
    
    m.Member_plan_id AS planId,
    
    mp.Plan_type AS planType,
    
    mp.Fees AS planFees,
    
    pd.Rental_discount AS rentalDiscount
    
    FROM MEMBER m
    
    JOIN users u
    
    ON m.user_id = u.user_id
    
    LEFT JOIN MEMBERSHIP_PLAN mp
    
    ON m.Member_plan_id = mp.Plan_id
    
    LEFT JOIN PLAN_DISCOUNT pd
    
    ON mp.Plan_type = pd.Plan_type
    
    WHERE m.user_id = ?
    
    `, [userId]);
    
    
    
    if (!profile) {
    
    return res.status(404).json({ error: 'Member profile not found.' });
    
    }
    
    res.json(profile);
    
    } catch (err) {
    
    next(err);
    
    }
    
    });
    
    
    
    // PUT /api/member/profile
    
    app.put('/api/member/profile', authenticateToken, async (req, res, next) => {
    
    if (req.user.role !== 'member') {
    
    return res.status(403).json({ error: 'Access forbidden. Member role required.' });
    
    }
    
    const userId = req.user.userId;
    
    const { firstName, lastName, email, phone } = req.body;
    
    
    
    // Simple validation
    
    if (!firstName || !lastName) {
    
    return res.status(400).json({ error: 'First and last name are required.' });
    
    }
    
    
    
    try {
    
    const [result] = await dbPool.query(`
    
    UPDATE MEMBER
    
    SET
    
    Fname = ?,
    
    Lname = ?,
    
    Email = ?,
    
    Phone_number = ?
    
    WHERE user_id = ?
    
    `, [firstName, lastName, email, phone, userId]);
    
    
    
    if (result.affectedRows === 0) {
    
    return res.status(404).json({ error: 'Member profile not found.' });
    
    }
    
    res.json({ message: 'Profile updated successfully.' });
    
    } catch (err) {
    
    next(err);
    
    }
    
    });
    
// GET /api/member/plans
app.get('/api/member/plans', async (req, res, next) => { try { const [p] = await dbPool.query(`SELECT mp.*, pd.Rental_discount FROM MEMBERSHIP_PLAN mp LEFT JOIN PLAN_DISCOUNT pd ON mp.Plan_type=pd.Plan_type ORDER BY mp.Fees ASC`); res.json(p); } catch (err) { next(err); } });
// PUT /api/member/plan
app.put('/api/member/plan', async (req, res, next) => { if (!req.user || req.user.role !== 'member') return res.status(403).json({ error: 'Forbidden' }); const { Plan_id } = req.body; const userId = req.user.userId; try { await dbPool.query(`UPDATE MEMBER SET Member_plan_id=? WHERE user_id=?`, [Plan_id, userId]); res.json({ message: 'Plan updated' }); } catch (err) { next(err); } });
// GET /api/member/tee-times
app.get('/api/member/tee-times', authenticateToken, async (req, res, next) => {
    if (req.user.role !== 'member')
        return res.status(403).json({ error: 'Member only.' });
    const userId = req.user.userId;
    try {
        // your existing upcoming...
        const [up] = await dbPool.query(`
      SELECT
        tt.Tee_time_id AS id,
        tt.Date        AS date,
        tt.Time        AS time,
        tt.Status      AS status,
        gc.Course_name AS courseName
      FROM TEE_TIME tt
      JOIN MEMBER_TEE_TIME mtt ON tt.Tee_time_id = mtt.Tee_time_id
      JOIN GOLF_COURSE gc ON tt.Course_id = gc.Course_id
      WHERE mtt.user_id = ? AND tt.Date >= CURDATE()
      ORDER BY tt.Date, tt.Time
    `, [userId]);

        // your existing history...
        const [hist] = await dbPool.query(`
      SELECT
        tt.Tee_time_id AS id,
        tt.Date        AS date,
        tt.Time        AS time,
        tt.Status      AS status,
        gc.Course_name AS courseName
      FROM TEE_TIME tt
      JOIN MEMBER_TEE_TIME mtt ON tt.Tee_time_id = mtt.Tee_time_id
      JOIN GOLF_COURSE gc ON tt.Course_id = gc.Course_id
      WHERE mtt.user_id = ? AND tt.Date < CURDATE()
      ORDER BY tt.Date DESC, tt.Time DESC
      LIMIT 10
    `, [userId]);

        // **NEW** available slots query
        const [avail] = await dbPool.query(`
      SELECT
        tt.Tee_time_id     AS id,
        tt.Date            AS date,
        tt.Time            AS time,
        tt.Available_slots AS spotsAvailable,
        gc.Course_name     AS courseName
      FROM TEE_TIME tt
      JOIN GOLF_COURSE gc ON tt.Course_id = gc.Course_id
      WHERE tt.Date >= CURDATE() AND tt.Available_slots > 0
      ORDER BY tt.Date, tt.Time
    `);

        res.json({ upcoming: up, history: hist, available: avail });
    } catch (err) {
        next(err);
    }
});
// GET /api/member/available-tee-times
app.get('/api/member/available-tee-times', async (req, res, next) => { if (!req.user || req.user.role !== 'member') { return res.status(403).json({ error: 'Forbidden' }); } const { date } = req.query; if (!date) return res.status(400).json({ error: 'Date required' }); try { const [times] = await dbPool.query(`SELECT tt.Tee_time_id, tt.Date, tt.Time, tt.Available_slots, gc.Course_name, gc.Course_id FROM TEE_TIME tt JOIN GOLF_COURSE gc ON tt.Course_id = gc.Course_id WHERE tt.Date = ? AND tt.Available_slots > 0 ORDER BY tt.Time`, [date]); res.json(times); } catch (error) { next(error); } });
// POST /api/member/book-tee-time
app.post('/api/member/book-tee-time', async (req, res, next) => { if (!req.user || req.user.role !== 'member') return res.status(403).json({ error: 'Forbidden' }); const { teeTimeId } = req.body; const userId = req.user.userId; if (!teeTimeId) return res.status(400).json({ error: 'ID required' }); const conn = await dbPool.getConnection(); try { await conn.beginTransaction(); const [tt] = await conn.query(`SELECT Available_slots FROM TEE_TIME WHERE Tee_time_id=? FOR UPDATE`, [teeTimeId]); if (tt.length === 0) { await conn.rollback(); return res.status(404).json({ error: 'Not found' }); } if (tt[0].Available_slots <= 0) { await conn.rollback(); return res.status(400).json({ error: 'No slots' }); } const [exist] = await conn.query(`SELECT * FROM MEMBER_TEE_TIME WHERE user_id=? AND Tee_time_id=?`, [userId, teeTimeId]); if (exist.length > 0) { await conn.rollback(); return res.status(400).json({ error: 'Already booked' }); } await conn.query(`INSERT INTO MEMBER_TEE_TIME (user_id, Tee_time_id) VALUES (?, ?)`, [userId, teeTimeId]); await conn.query(`UPDATE TEE_TIME SET Available_slots=Available_slots-1 WHERE Tee_time_id=?`, [teeTimeId]); await conn.commit(); const [utt] = await conn.query(`SELECT tt.*, gc.Course_name FROM TEE_TIME tt JOIN GOLF_COURSE gc ON tt.Course_id=gc.Course_id WHERE tt.Tee_time_id=?`, [teeTimeId]); res.json({ message: 'Booked', teeTime: utt[0] }); } catch (err) { await conn.rollback(); next(err); } finally { conn.release(); } });
// POST /api/member/cancel-tee-time
app.post('/api/member/cancel-tee-time', async (req, res, next) => { if (!req.user || req.user.role !== 'member') return res.status(403).json({ error: 'Forbidden' }); const { teeTimeId } = req.body; const userId = req.user.userId; if (!teeTimeId) return res.status(400).json({ error: 'ID required' }); const conn = await dbPool.getConnection(); try { await conn.beginTransaction(); const [book] = await conn.query(`SELECT * FROM MEMBER_TEE_TIME WHERE user_id=? AND Tee_time_id=?`, [userId, teeTimeId]); if (book.length === 0) { await conn.rollback(); return res.status(404).json({ error: 'Booking not found' }); } await conn.query(`DELETE FROM MEMBER_TEE_TIME WHERE user_id=? AND Tee_time_id=?`, [userId, teeTimeId]); await conn.query(`UPDATE TEE_TIME SET Available_slots=Available_slots+1 WHERE Tee_time_id=?`, [teeTimeId]); await conn.commit(); res.json({ message: 'Cancelled' }); } catch (err) { await conn.rollback(); next(err); } finally { conn.release(); } });
// GET /api/member/equipment
app.get('/api/member/equipment', async (req, res, next) => {
    if (!req.user || req.user.role !== 'member') return res.status(403).json({ error: 'Forbidden' });
    const userId = req.user.userId;
    try {
        const [avail]=await dbPool.query(`SELECT et.Type, et.Rental_fee, COUNT(e.Equipment_id) as available FROM EQUIPMENT_TYPE et LEFT JOIN EQUIPMENT e ON et.Type=e.Type AND e.Availability=TRUE GROUP BY et.Type, et.Rental_fee ORDER BY et.Type`);
        const [rent]=await dbPool.query(`SELECT er.*, et.Type FROM EQUIPMENT_RENTAL er JOIN EQUIPMENT e ON er.Equipment_id=e.Equipment_id JOIN EQUIPMENT_TYPE et ON e.Type=et.Type WHERE er.user_id=? AND er.Returned=FALSE ORDER BY er.Rental_date DESC`,[userId]);
        res.json({available:avail, rentals:rent});
    } catch(err){next(err);}
});
// POST /api/member/rent-equipment
app.post('/api/member/rent-equipment', async (req, res, next) => {
    if (!req.user || req.user.role !== 'member') return res.status(403).json({ error: 'Forbidden' });
    const { items } = req.body;
    const userId = req.user.userId;
    if (!items || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Invalid data.' });
    const conn = await dbPool.getConnection();
    try {
        await conn.beginTransaction();
        const rentalResults = [];
        for(const item of items){
            const [availEq]=await conn.query(`SELECT Equipment_id FROM EQUIPMENT WHERE Type=? AND Availability=TRUE LIMIT ? FOR UPDATE`,[item.type, item.quantity]);
            if(availEq.length<item.quantity){await conn.rollback(); return res.status(400).json({error:`Not enough ${item.type}`});}
            const today=new Date();
            const retDate=new Date(today);
            retDate.setDate(today.getDate()+7);
            for(const eq of availEq){
                const [rentRes]=await conn.query(`INSERT INTO EQUIPMENT_RENTAL (user_id, Equipment_id, Rental_date, Return_date, Returned) VALUES (?, ?, CURDATE(), ?, FALSE)`,[userId, eq.Equipment_id, retDate.toISOString().split('T')[0]]);
                await conn.query(`UPDATE EQUIPMENT SET Availability=FALSE WHERE Equipment_id=?`,[eq.Equipment_id]);
                const [typeRes]=await conn.query(`SELECT Type FROM EQUIPMENT WHERE Equipment_id=?`,[eq.Equipment_id]);
                rentalResults.push({Rental_id: rentRes.insertId, Type:typeRes[0].Type, Rental_date:today.toISOString().split('T')[0], Return_date:retDate.toISOString().split('T')[0], Returned:false});
            }
        }
        await conn.commit();
        res.json({message:'Rented', rentals:rentalResults});
    } catch(err){await conn.rollback(); next(err);} finally{conn.release();}
});
// POST /api/member/equipment/:rentalId/return
app.post('/api/member/equipment/:rentalId/return', async (req, res, next) => {
    if (!req.user || req.user.role !== 'member') return res.status(403).json({ error: 'Forbidden' });
    const { rentalId } = req.params;
    const userId = req.user.userId;
    const conn = await dbPool.getConnection();
    try {
        await conn.beginTransaction();
        // Check if the rental exists and belongs to the user
        const [rental] = await conn.query(
            'SELECT * FROM EQUIPMENT_RENTAL WHERE Rental_id = ? AND user_id = ? AND Returned = FALSE',
            [rentalId, userId]
        );
        if (rental.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'Rental not found or already returned.' });
        }
        // Mark as returned
        await conn.query(
            'UPDATE EQUIPMENT_RENTAL SET Returned = TRUE, Return_date = CURDATE() WHERE Rental_id = ?',
            [rentalId]
        );
        // Make equipment available again
        await conn.query(
            'UPDATE EQUIPMENT SET Availability = TRUE WHERE Equipment_id = ?',
            [rental[0].Equipment_id]
        );
        await conn.commit();
        res.json({ message: 'Equipment returned successfully.' });
    } catch (err) {
        await conn.rollback();
        next(err);
    } finally {
        conn.release();
    }
});

// ---> ADDED Staff/Admin specific routes for plan assignment <---

// GET /api/staff/plans (Get list of plans for dropdown)
// Added authenticateToken via app.use('/api/staff', ...)
app.get('/api/staff/plans', async (req, res, next) => {
    // Allow Admins or Employees (already checked by middleware applied to group)
    try {
        const [plans] = await dbPool.query('SELECT Plan_id, Plan_type, Fees FROM MEMBERSHIP_PLAN ORDER BY Plan_type');
        res.json(plans);
    } catch (error) {
        console.error("Error fetching plans for staff:", error);
        next(error);
    }
});

// PUT /api/staff/members/:userId/plan (Assign/Update a member's plan)
// Added authenticateToken via app.use('/api/staff', ...)
// Renamed route slightly for clarity
app.put('/api/staff/members/:userId/plan', async (req, res, next) => {
    // Allow Admins or Employees
     if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'employee')) {
        // Belt-and-suspenders check, though middleware should catch it
        return res.status(403).json({ error: 'Forbidden: Admin/Employee access required.' });
    }

    const targetUserId = req.params.userId;
    let { Plan_id } = req.body; // Plan_id can be ID string, null, or empty string

    // Treat empty string value from dropdown as NULL for removal
    if (Plan_id === "") {
        Plan_id = null;
    }

    if (!targetUserId || targetUserId === 'undefined' || targetUserId === 'null') { // Add checks for invalid userId string
        return res.status(400).json({ error: 'Target User ID is required.' });
    }

    // Validate Plan_id exists if not null
    if (Plan_id !== null) {
         try {
             const [planExists] = await dbPool.query('SELECT Plan_id FROM MEMBERSHIP_PLAN WHERE Plan_id = ?', [Plan_id]);
             if (planExists.length === 0) {
                 return res.status(400).json({ error: 'Invalid Plan ID selected.' });
             }
         } catch(error) { next(error); return; }
    }

    try {
        // Ensure target user exists in MEMBER table first
         const [memberExists] = await dbPool.query('SELECT user_id FROM MEMBER WHERE user_id = ?', [targetUserId]);
         if (memberExists.length === 0) {
             return res.status(404).json({ error: 'Member profile not found for the given User ID.' });
         }

        // Update the plan
        const [result] = await dbPool.query(
            'UPDATE MEMBER SET Member_plan_id = ? WHERE user_id = ?',
            [Plan_id, targetUserId] // Pass validated Plan_id (or null)
        );

        // Check if update actually changed anything (might already have that plan or null)
        // if (result.affectedRows === 0) {
        //     return res.status(404).json({ error: 'Member not found or plan was already set to this value.' });
        // }

        res.json({ message: `Membership plan updated successfully for user ${targetUserId}` });

    } catch (error) {
         console.error(`Error updating plan for user ${targetUserId}:`, error);
         next(error);
    }
});
// --------------------------------------------------------------


// --- User Self-Service Routes ---
// POST /api/user/change-password
app.post('/api/user/change-password', authenticateToken, async (req, res, next) => {
    const { currentPassword, newPassword } = req.body; const userId = req.user.userId; if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Passwords required.' }); if (newPassword.length < 4) return res.status(400).json({ error: 'New password min 4 chars.' }); try { const [rows] = await dbPool.query('SELECT password_hash FROM users WHERE user_id = ?', [userId]); if (rows.length === 0) return res.status(404).json({ error: 'User not found.' }); const user = rows[0]; const isMatch = await bcrypt.compare(currentPassword, user.password_hash); if (!isMatch) return res.status(401).json({ error: 'Incorrect current password.' }); const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds); await dbPool.query('UPDATE users SET password_hash = ? WHERE user_id = ?', [hashedNewPassword, userId]); res.json({ message: 'Password updated.' }); } catch (error) { next(error); }
});


// === Catch-all & Error Handling ===
app.get('*', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'index.html')); });
app.use((err, req, res, next) => { console.error("Global Handler:", err.message); console.error(err.stack); res.status(err.status || 500).json({ error: err.message || 'Server error.' }); });

// === Start Server ===
app.listen(PORT, () => { console.log(`Server running on http://localhost:${PORT}`); });