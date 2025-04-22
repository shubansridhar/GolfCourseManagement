// DBPROJ/server.js

require('dotenv').config(); // Load .env variables first
const express = require('express');
const mysql = require('mysql2'); // Keep using mysql2 as you have it
const cors = require('cors');
// const bodyParser = require('body-parser'); // Not strictly needed with modern Express
const path = require('path');
const bcrypt = require('bcrypt');         // <-- ADD: For password hashing
const jwt = require('jsonwebtoken'); // <-- ADD: For login tokens

const app = express();
// Use PORT from .env, default to 3001 if not set
const PORT = process.env.PORT || 3001; // <-- Use 3001 as default

// Middleware
app.use(cors());
// Use built-in Express body parsers instead of bodyParser package
app.use(express.json()); // <-- Replace bodyParser.json()
app.use(express.urlencoded({ extended: true })); // <-- Replace bodyParser.urlencoded()
app.use(express.static(path.join(__dirname, 'public')));

// --- Database Connection ---
// Use a connection pool for better performance and reliability
const dbPool = mysql.createPool({
    host: process.env.DB_HOST, // <-- Use .env variable
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, // <-- Use .env variable (will be empty string if blank in .env)
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000
}).promise(); // <-- Use the promise wrapper for async/await

// Check initial connection
dbPool.getConnection()
    .then(connection => {
        console.log('Successfully connected to the database pool.');
        connection.release();
    })
    .catch(err => {
        console.error('!!! DATABASE POOL CONNECTION FAILED !!! Error:', err.message);
    });

// Middleware to check if DB seems available (optional - basic check)
// Note: A more robust check might involve a quick query
const checkDbConnection = async (req, res, next) => {
    try {
        // Try getting a connection briefly to see if pool is healthy
        const connection = await dbPool.getConnection();
        connection.release();
        next(); // If connection successful, proceed
    } catch (dbError) {
         if (req.path.startsWith('/api/')) { // Only block API requests
            console.error("DB Pool check failed:", dbError.message);
            res.status(503).json({
                error: 'Database connection is not available',
                message: 'Please make sure your MySQL server is running and accessible.'
            });
        } else {
            next(); // Allow non-API requests (like serving HTML) even if DB is down
        }
    }
};
// Apply the check DB middleware BEFORE your API routes
// You might want to exclude auth routes if you want users to login even if DB is temporarily down?
// For now, let's apply it to all /api routes.
app.use('/api', checkDbConnection);


// === Authentication API Routes ===

const saltRounds = 10; // For bcrypt

// POST /api/auth/signup
app.post('/api/auth/signup', async (req, res, next) => {
    const { username, password, role } = req.body;
    console.log("Signup attempt:", { username, role });

    if (!username || !password || !role) return res.status(400).json({ error: 'Username, password, and role required.' });
    const allowedRoles = ['admin', 'employee', 'member'];
    if (!allowedRoles.includes(role)) return res.status(400).json({ error: 'Invalid role specified.' });

    try {
        // Check if admin setup allowed
        if (role === 'admin') {
            const [adminRows] = await dbPool.query('SELECT COUNT(*) as adminCount FROM users WHERE role = ?', ['admin']);
            if (adminRows[0].adminCount > 0) return res.status(403).json({ error: 'Admin user already exists.' });
        }

        // Check existing username
        const [userRows] = await dbPool.query('SELECT user_id FROM users WHERE username = ?', [username]);
        if (userRows.length > 0) return res.status(409).json({ error: 'Username already taken.' });

        // Hash password
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Insert user
        const [insertResult] = await dbPool.query( 'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', [username, hashedPassword, role] );
        console.log(`User ${username} (${role}) created successfully with ID: ${insertResult.insertId}`);
        res.status(201).json({ message: `User '${username}' created successfully as ${role}!` });

    } catch (error) { next(error); } // Pass DB or other errors to global handler
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res, next) => {
    const { username, password } = req.body;
    console.log("Login attempt:", { username });

    if (!username || !password) return res.status(400).json({ error: 'Username and password required.' });

    try {
        // Find user
        const [userRows] = await dbPool.query( 'SELECT user_id, username, password_hash, role FROM users WHERE username = ?', [username] );
        if (userRows.length === 0) return res.status(401).json({ error: 'Invalid username or password.' });
        const user = userRows[0];

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(401).json({ error: 'Invalid username or password.' });

        // Generate JWT
        const payload = { userId: user.user_id, username: user.username, role: user.role };
        const secret = process.env.JWT_SECRET;
        if (!secret) { console.error("FATAL: JWT_SECRET not set!"); return res.status(500).json({ error: "Server configuration error." }); }
        const token = jwt.sign(payload, secret, { expiresIn: '1h' });

        console.log(`Token generated for ${user.username}`);
        res.status(200).json({ message: 'Login successful!', token: token, username: user.username, role: user.role });

    } catch (error) { next(error); }
});


// === Existing API Routes for Tables ===
// (Your existing routes for /api/tables, structure, data, POST, DELETE)
// IMPORTANT: These should be protected later with authentication middleware
// We also need to adapt them slightly to use the dbPool and async/await

// Get all tables
app.get('/api/tables', async (req, res, next) => {
    try {
        const [results] = await dbPool.query("SHOW TABLES");
        const tables = results.map(row => Object.values(row)[0]);
        res.json(tables);
    } catch (err) {
        console.error('Error fetching tables:', err);
        next(err); // Pass to error handler
    }
});

// Get table structure
app.get('/api/tables/:tableName/structure', async (req, res, next) => {
    const tableName = req.params.tableName;
     // Basic sanitization: Use backticks, ensure no malicious chars (more robust needed for production)
     if (!tableName.match(/^[a-zA-Z0-9_]+$/)) {
         return res.status(400).json({ error: 'Invalid table name format.' });
     }
    const query = `DESCRIBE \`${tableName}\``; // Use backticks for table name
    try {
        const [results] = await dbPool.query(query);
        res.json(results);
    } catch (err) {
        console.error(`Error fetching structure for table ${tableName}:`, err);
        // Provide specific error message if possible
        if (err.code === 'ER_NO_SUCH_TABLE') {
             return res.status(404).json({ error: `Table '${tableName}' not found.` });
        }
        next(err);
    }
});

// Get data from a specific table
app.get('/api/tables/:tableName', async (req, res, next) => {
    const tableName = req.params.tableName;
     if (!tableName.match(/^[a-zA-Z0-9_]+$/)) { return res.status(400).json({ error: 'Invalid table name format.' }); }
    const query = `SELECT * FROM \`${tableName}\``; // Use backticks
    try {
        const [results] = await dbPool.query(query);
        res.json(results);
    } catch (err) {
        console.error(`Error fetching data from table ${tableName}:`, err);
         if (err.code === 'ER_NO_SUCH_TABLE') { return res.status(404).json({ error: `Table '${tableName}' not found.` }); }
        next(err);
    }
});

// Insert data into a table
app.post('/api/tables/:tableName', async (req, res, next) => {
    const tableName = req.params.tableName;
    if (!tableName.match(/^[a-zA-Z0-9_]+$/)) { return res.status(400).json({ error: 'Invalid table name format.' }); }
    const data = req.body;

    // Basic filtering of empty values (adjust if empty strings are valid for some fields)
    const cleanData = {};
    Object.keys(data).forEach(key => {
        // Keep non-empty strings, numbers (including 0), booleans, dates
        // Exclude null, undefined, empty strings
        if (data[key] !== '' && data[key] !== null && data[key] !== undefined) {
            cleanData[key] = data[key];
        }
         // You might explicitly allow empty string for certain types if needed
    });

    if (Object.keys(cleanData).length === 0) {
        return res.status(400).json({ error: 'No valid data provided for insertion' });
    }

    // Use SET ? for simple inserts - keys in cleanData must match column names
    const query = `INSERT INTO \`${tableName}\` SET ?`;
    try {
        const [results] = await dbPool.query(query, cleanData);
        res.status(201).json({ // Use 201 Created status
            message: `Data inserted successfully into ${tableName}`,
            insertId: results.insertId
        });
    } catch (err) {
        console.error(`Error inserting data into table ${tableName}:`, err);
        next(err);
    }
});

// Delete data from a table
app.delete('/api/tables/:tableName/:id', async (req, res, next) => {
    const tableName = req.params.tableName;
    const id = req.params.id;
     if (!tableName.match(/^[a-zA-Z0-9_]+$/)) { return res.status(400).json({ error: 'Invalid table name format.' }); }
     // Assume primaryKey query parameter identifies the column name
     const primaryKeyName = req.query.primaryKey;
     if (!primaryKeyName || !primaryKeyName.match(/^[a-zA-Z0-9_]+$/)) {
          return res.status(400).json({ error: 'Valid primaryKey query parameter is required.' });
      }

    // Use parameterized query to prevent SQL injection
    // Use backticks around identifiers (table, column names)
    const query = `DELETE FROM \`${tableName}\` WHERE \`${primaryKeyName}\` = ?`;
    try {
        const [results] = await dbPool.query(query, [id]);
        if (results.affectedRows === 0) {
            return res.status(404).json({ error: `Record with ${primaryKeyName} = ${id} not found in ${tableName}` });
        }
        res.json({ message: `Data deleted successfully from ${tableName}`, affectedRows: results.affectedRows });
    } catch (err) {
        console.error(`Error deleting data from table ${tableName}:`, err);
        next(err);
    }
});


// Serve the main HTML file for any other routes (useful for SPA routing)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// === Global Error Handling Middleware ===
app.use((err, req, res, next) => {
    console.error("Global Error Handler Caught:", err.message);
    console.error(err.stack);
    // Send appropriate status code if available, otherwise default to 500
    res.status(err.status || 500).json({
        error: err.message || 'An unexpected error occurred on the server.',
        // Optionally include more details in development
        ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
    });
});

// === Start Server ===
app.listen(PORT, () => {
    console.log(`Backend server listening on http://localhost:${PORT}`);
    // dbPool connection attempt happens when db.js is required
});