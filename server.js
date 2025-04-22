// DBPROJ/server.js

require('dotenv').config(); // Load .env variables first
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3001;

// === Core Middleware ===
app.use(cors()); // Allow cross-origin requests
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from 'public'

// === Database Connection Pool ===
const dbPool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000
}).promise(); // Use the promise wrapper

// Check initial connection
dbPool.getConnection()
    .then(connection => {
        console.log('Successfully connected to the database pool.');
        connection.release();
    })
    .catch(err => {
        console.error('!!! DATABASE POOL CONNECTION FAILED !!! Error:', err.message);
    });

// === Custom Middleware Definitions ===

// Middleware to check DB connection before API requests
const checkDbConnection = async (req, res, next) => {
    try {
        const connection = await dbPool.getConnection();
        connection.release();
        next(); // Proceed if connection is acquired successfully
    } catch (dbError) {
         // Only block API requests if DB is down
         if (req.path.startsWith('/api/')) {
            console.error("DB Pool check failed for API route:", dbError.message);
            return res.status(503).json({ // Send 503 Service Unavailable
                error: 'Database connection is not available',
                message: 'Please ensure the database server is running and accessible.'
            });
        } else {
            next(); // Allow non-API requests (like serving HTML)
        }
    }
};

// Middleware to authenticate JWT token
const authenticateToken = (req, res, next) => {
    console.log("authenticateToken middleware triggered for:", req.path);
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

    if (token == null) {
        console.log("Auth Middleware: No token provided.");
        return res.status(401).json({ error: 'Authentication required: No token provided.' }); // Unauthorized
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, userPayload) => {
        if (err) {
            console.warn("Auth Middleware: Token verification failed:", err.name);
            return res.status(403).json({ error: 'Token is not valid or has expired.' }); // Forbidden
        }
        // Token is valid, attach payload to request object
        req.user = userPayload; // Contains { userId, username, role }
        console.log("Auth Middleware: Token verified. User:", req.user);
        next(); // Proceed to the next middleware or route handler
    });
};

// === Apply Custom Middleware ===
// Apply DB Check to ALL routes starting with /api
app.use('/api', checkDbConnection);
// Apply Auth Check ONLY to routes starting with /api/tables
app.use('/api/tables', authenticateToken);


// === API Route Definitions ===

// --- Authentication Routes (No authenticateToken middleware applied) ---
const saltRounds = 10;

// POST /api/auth/signup
app.post('/api/auth/signup', async (req, res, next) => {
    const { username, password, role } = req.body;
    console.log("Signup attempt:", { username, role });
    if (!username || !password || !role) return res.status(400).json({ error: 'Username, password, and role required.' });
    const allowedRoles = ['admin', 'employee', 'member'];
    if (!allowedRoles.includes(role)) return res.status(400).json({ error: 'Invalid role specified.' });
    try {
        if (role === 'admin') {
            const [adminRows] = await dbPool.query('SELECT COUNT(*) as adminCount FROM users WHERE role = ?', ['admin']);
            if (adminRows[0].adminCount > 0) return res.status(403).json({ error: 'Admin user already exists.' });
        }
        const [userRows] = await dbPool.query('SELECT user_id FROM users WHERE username = ?', [username]);
        if (userRows.length > 0) return res.status(409).json({ error: 'Username already taken.' });
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const [insertResult] = await dbPool.query( 'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', [username, hashedPassword, role] );
        console.log(`User ${username} (${role}) created successfully with ID: ${insertResult.insertId}`);
        res.status(201).json({ message: `User '${username}' created successfully as ${role}!` });
    } catch (error) { next(error); }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res, next) => {
    const { username, password } = req.body;
    console.log("Login attempt:", { username });
    if (!username || !password) return res.status(400).json({ error: 'Username and password required.' });
    try {
        const [userRows] = await dbPool.query( 'SELECT user_id, username, password_hash, role FROM users WHERE username = ?', [username] );
        if (userRows.length === 0) return res.status(401).json({ error: 'Invalid username or password.' });
        const user = userRows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(401).json({ error: 'Invalid username or password.' });
        const payload = { userId: user.user_id, username: user.username, role: user.role };
        const secret = process.env.JWT_SECRET;
        if (!secret) { console.error("FATAL: JWT_SECRET not set!"); return res.status(500).json({ error: "Server configuration error." }); }
        const token = jwt.sign(payload, secret, { expiresIn: '1h' });
        console.log(`Token generated for ${user.username}`);
        res.status(200).json({ message: 'Login successful!', token: token, username: user.username, role: user.role });
    } catch (error) { next(error); }
});


// --- Table Data Routes (checkDbConnection AND authenticateToken middleware applied) ---

// GET /api/tables - List tables
app.get('/api/tables', async (req, res, next) => {
    // Now you can access req.user here if needed for RBAC later
    console.log(`User requesting table list: ${req.user?.username} (Role: ${req.user?.role})`);
    try {
        const [results] = await dbPool.query("SHOW TABLES");
        // Filter out the 'users' table maybe? Or handle based on role later.
        const tables = results.map(row => Object.values(row)[0]).filter(name => name !== 'users');
        res.json(tables);
    } catch (err) { next(err); }
});

// GET /api/tables/:tableName/structure - Get structure
app.get('/api/tables/:tableName/structure', async (req, res, next) => {
    const tableName = req.params.tableName;
    console.log(`User ${req.user?.username} requesting structure for ${tableName}`);
     if (!tableName.match(/^[a-zA-Z0-9_]+$/)) return res.status(400).json({ error: 'Invalid table name format.' });
    if (tableName.toLowerCase() === 'users') return res.status(403).json({ error: 'Access denied.' }); // Prevent accessing users table structure easily
    const query = `DESCRIBE \`${tableName}\``;
    try {
        const [results] = await dbPool.query(query);
        res.json(results);
    } catch (err) { if (err.code === 'ER_NO_SUCH_TABLE') return res.status(404).json({ error: `Table '${tableName}' not found.` }); next(err); }
});

// GET /api/tables/:tableName - Get data
app.get('/api/tables/:tableName', async (req, res, next) => {
    const tableName = req.params.tableName;
    console.log(`User ${req.user?.username} requesting data for ${tableName}`);
    if (!tableName.match(/^[a-zA-Z0-9_]+$/)) return res.status(400).json({ error: 'Invalid table name format.' });
    if (tableName.toLowerCase() === 'users') return res.status(403).json({ error: 'Access denied.' }); // Prevent accessing users table data easily
    const query = `SELECT * FROM \`${tableName}\``; // TODO: Add LIMIT/OFFSET for pagination later
    try {
        const [results] = await dbPool.query(query);
        res.json(results);
    } catch (err) { if (err.code === 'ER_NO_SUCH_TABLE') return res.status(404).json({ error: `Table '${tableName}' not found.` }); next(err); }
});

// POST /api/tables/:tableName - Insert data
app.post('/api/tables/:tableName', async (req, res, next) => {
    const tableName = req.params.tableName;
    console.log(`User ${req.user?.username} attempting to insert into ${tableName}`);
    if (!tableName.match(/^[a-zA-Z0-9_]+$/)) return res.status(400).json({ error: 'Invalid table name format.' });
    if (tableName.toLowerCase() === 'users') return res.status(403).json({ error: 'Access denied.' }); // Prevent direct modification
    const data = req.body;
    const cleanData = {};
    Object.keys(data).forEach(key => { if (data[key] !== '' && data[key] !== null && data[key] !== undefined) cleanData[key] = data[key]; });
    if (Object.keys(cleanData).length === 0) return res.status(400).json({ error: 'No valid data provided for insertion' });
    const query = `INSERT INTO \`${tableName}\` SET ?`;
    try {
        // TODO: Add role check here - is req.user.role allowed to INSERT into this tableName?
        const [results] = await dbPool.query(query, cleanData);
        res.status(201).json({ message: `Data inserted successfully into ${tableName}`, insertId: results.insertId });
    } catch (err) { next(err); }
});

// DELETE /api/tables/:tableName/:id - Delete data
app.delete('/api/tables/:tableName/:id', async (req, res, next) => {
    const tableName = req.params.tableName;
    const id = req.params.id;
    console.log(`User ${req.user?.username} attempting to delete from ${tableName} where ID=${id}`);
    if (!tableName.match(/^[a-zA-Z0-9_]+$/)) return res.status(400).json({ error: 'Invalid table name format.' });
    if (tableName.toLowerCase() === 'users') return res.status(403).json({ error: 'Access denied.' }); // Prevent direct modification
    const primaryKeyName = req.query.primaryKey;
    if (!primaryKeyName || !primaryKeyName.match(/^[a-zA-Z0-9_]+$/)) return res.status(400).json({ error: 'Valid primaryKey query parameter required.' });
    const query = `DELETE FROM \`${tableName}\` WHERE \`${primaryKeyName}\` = ?`;
    try {
        // TODO: Add role check here - is req.user.role allowed to DELETE from this tableName?
        const [results] = await dbPool.query(query, [id]);
        if (results.affectedRows === 0) return res.status(404).json({ error: `Record with ${primaryKeyName} = ${id} not found in ${tableName}` });
        res.json({ message: `Data deleted successfully from ${tableName}`, affectedRows: results.affectedRows });
    } catch (err) { next(err); }
});

// === Catch-all route for Frontend ===
// Serves index.html for any routes not matched above (helps with potential client-side routing)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// === Global Error Handling Middleware ===
// Catches errors passed by next(err)
app.use((err, req, res, next) => {
    console.error("Global Error Handler Caught:", err.message);
    console.error(err.stack); // Log stack in development
    res.status(err.status || 500).json({ // Use error status if available, otherwise 500
        error: err.message || 'An unexpected error occurred on the server.'
        // Optionally add more detail in development:
        // ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
    });
});

// === Start Server ===
app.listen(PORT, () => {
    console.log(`Backend server listening on http://localhost:${PORT}`);
    // Initial DB connection check happened when dbPool was required
});