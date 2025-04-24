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
    port: 3306,
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
app.use('/api', checkDbConnection);
// Auth Check applies ONLY to /api/tables/* AND the new /api/admin/* routes
app.use('/api/tables', authenticateToken);
app.use('/api/admin', authenticateToken); // <-- Protect admin routes too


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
        const [insertResult] = await dbPool.query('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', [username, hashedPassword, role]);
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
        const [userRows] = await dbPool.query('SELECT user_id, username, password_hash, role FROM users WHERE username = ?', [username]);
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

// GET /api/admin/users - Fetch all users (Admin Only)
app.get('/api/admin/users', async (req, res, next) => {
    console.log(`Admin route /api/admin/users accessed by: ${req.user?.username} (Role: ${req.user?.role})`);

    // 1. Check if user is Admin (user info is attached by authenticateToken middleware)
    if (!req.user || req.user.role !== 'admin') {
        console.warn("Forbidden: Non-admin user attempted to access user list.");
        return res.status(403).json({ error: 'Access Forbidden: Admin role required.' });
    }

    // 2. Fetch users from DB (excluding password hash)
    try {
        const query = 'SELECT user_id, username, role, created_at FROM users ORDER BY user_id';
        const [users] = await dbPool.query(query);
        res.json(users); // Send the list of users
    } catch (error) {
        console.error("Error fetching users for admin:", error);
        next(error); // Pass error to global handler
    }
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

// New route for statistics (protected by authenticateToken)
app.get('/api/statistics', authenticateToken, async (req, res, next) => {
    console.log(`Statistics endpoint accessed by: ${req.user?.username} (Role: ${req.user?.role})`);

    // Only allow admin and employee roles to access statistics
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'employee')) {
        console.warn("Forbidden: User without admin/employee role attempted to access statistics.");
        return res.status(403).json({ error: 'Access Forbidden: Admin or Employee role required.' });
    }

    try {
        // Get the counts of records for each table
        const tableCounts = {};
        const [tables] = await dbPool.query("SHOW TABLES");
        const tableNames = tables.map(row => Object.values(row)[0]).filter(name => name !== 'users');

        // Execute queries for each table in parallel
        const countPromises = tableNames.map(async (tableName) => {
            const [countResult] = await dbPool.query(`SELECT COUNT(*) as count FROM \`${tableName}\``);
            return { tableName, count: countResult[0].count };
        });

        const counts = await Promise.all(countPromises);
        counts.forEach(({ tableName, count }) => {
            tableCounts[tableName] = count;
        });

        // Get additional statistics
        // 1. Get member count by plan type
        const [membersByPlan] = await dbPool.query(`
            SELECT MEMBERSHIP_PLAN.Plan_type, COUNT(MEMBER.Member_id) as count 
            FROM MEMBER 
            JOIN MEMBERSHIP_PLAN ON MEMBER.Member_plan_id = MEMBERSHIP_PLAN.Plan_id 
            GROUP BY MEMBERSHIP_PLAN.Plan_type
        `);

        // 2. Get booked vs available tee times
        const [teeTimeStatus] = await dbPool.query(`
            SELECT Status, COUNT(*) as count 
            FROM TEE_TIME 
            GROUP BY Status
        `);

        // 3. Get equipment availability summary
        const [equipmentAvailability] = await dbPool.query(`
            SELECT EQUIPMENT_TYPE.Type, 
                   SUM(CASE WHEN EQUIPMENT.Availability = TRUE THEN 1 ELSE 0 END) as available,
                   COUNT(EQUIPMENT.Equipment_id) as total
            FROM EQUIPMENT
            JOIN EQUIPMENT_TYPE ON EQUIPMENT.Type = EQUIPMENT_TYPE.Type
            GROUP BY EQUIPMENT_TYPE.Type
        `);

        // Return all statistics
        res.json({
            tableCounts,
            membersByPlan,
            teeTimeStatus,
            equipmentAvailability
        });
    } catch (error) {
        console.error("Error generating statistics:", error);
        next(error);
    }
});

// === Member API Routes ===

// Get member profile
app.get('/api/member/profile', authenticateToken, async (req, res, next) => {
    // Only allow member access
    if (!req.user || req.user.role !== 'member') {
        return res.status(403).json({ error: 'Access forbidden. Member role required.' });
    }

    try {
        // Get member info by username
        const [members] = await dbPool.query(`
            SELECT m.*, mc.Email, mc.Phone_number, pd.Rental_discount
            FROM MEMBER m
            LEFT JOIN MEMBER_CONTACT mc ON m.Member_id = mc.Member_id
            LEFT JOIN MEMBERSHIP_PLAN mp ON m.Member_plan_id = mp.Plan_id
            LEFT JOIN PLAN_DISCOUNT pd ON mp.Plan_type = pd.Plan_type
            WHERE m.Member_id IN (
                SELECT m.Member_id 
                FROM MEMBER m 
                JOIN users u ON LOWER(CONCAT(m.Fname, '.', m.Lname)) = LOWER(u.username)
                WHERE u.username = ?
            )
        `, [req.user.username]);

        if (members.length === 0) {
            // If no member profile exists, get user info and create placeholder data
            return res.json({
                Member_id: 0,
                Fname: req.user.username,
                Lname: '',
                Member_plan_id: null,
                Email: '',
                Phone_number: '',
                Rental_discount: 0
            });
        }

        res.json(members[0]);
    } catch (error) {
        console.error("Error fetching member profile:", error);
        next(error);
    }
});

// Update member profile
app.put('/api/member/profile', authenticateToken, async (req, res, next) => {
    // Only allow member access
    if (!req.user || req.user.role !== 'member') {
        return res.status(403).json({ error: 'Access forbidden. Member role required.' });
    }

    const { Member_id, Fname, Lname, Email, Phone_number } = req.body;

    try {
        // Update MEMBER table
        await dbPool.query(`
            UPDATE MEMBER
            SET Fname = ?, Lname = ?
            WHERE Member_id = ?
        `, [Fname, Lname, Member_id]);

        // Update or insert MEMBER_CONTACT
        const [contactCheck] = await dbPool.query('SELECT Contact_id FROM MEMBER_CONTACT WHERE Member_id = ?', [Member_id]);

        if (contactCheck.length > 0) {
            await dbPool.query(`
                UPDATE MEMBER_CONTACT
                SET Email = ?, Phone_number = ?
                WHERE Member_id = ?
            `, [Email, Phone_number, Member_id]);
        } else {
            await dbPool.query(`
                INSERT INTO MEMBER_CONTACT (Member_id, Email, Phone_number)
                VALUES (?, ?, ?)
            `, [Member_id, Email, Phone_number]);
        }

        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error("Error updating member profile:", error);
        next(error);
    }
});

// Get membership plans
app.get('/api/member/plans', authenticateToken, async (req, res, next) => {
    try {
        // Get all membership plans with discount info
        const [plans] = await dbPool.query(`
            SELECT mp.*, pd.Rental_discount
            FROM MEMBERSHIP_PLAN mp
            LEFT JOIN PLAN_DISCOUNT pd ON mp.Plan_type = pd.Plan_type
            ORDER BY mp.Fees ASC
        `);

        res.json(plans);
    } catch (error) {
        console.error("Error fetching membership plans:", error);
        next(error);
    }
});

// Update membership plan
app.put('/api/member/plan', authenticateToken, async (req, res, next) => {
    // Only allow member access
    if (!req.user || req.user.role !== 'member') {
        return res.status(403).json({ error: 'Access forbidden. Member role required.' });
    }

    const { Member_id, Plan_id } = req.body;

    try {
        // Update member's plan
        await dbPool.query(`
            UPDATE MEMBER
            SET Member_plan_id = ?
            WHERE Member_id = ?
        `, [Plan_id, Member_id]);

        res.json({ message: 'Membership plan updated successfully' });
    } catch (error) {
        console.error("Error updating membership plan:", error);
        next(error);
    }
});

// Get member tee times
app.get('/api/member/tee-times', authenticateToken, async (req, res, next) => {
    // Only allow member access
    if (!req.user || req.user.role !== 'member') {
        return res.status(403).json({ error: 'Access forbidden. Member role required.' });
    }

    try {
        // Get upcoming tee times for the member
        const [upcomingTeeTimes] = await dbPool.query(`
            SELECT 
                tt.Tee_time_id,
                tt.Date,
                tt.Time,
                gc.Course_name
            FROM TEE_TIME tt
            JOIN GOLF_COURSE gc ON tt.Course_id = gc.Course_id
            JOIN MEMBER_TEE_TIME mtt ON tt.Tee_time_id = mtt.Tee_time_id
            WHERE mtt.Member_id = ? 
            AND tt.Date >= CURDATE()
            ORDER BY tt.Date, tt.Time
        `, [req.user.userId]);

        // Get tee time history for the member
        const [teeTimeHistory] = await dbPool.query(`
            SELECT 
                tt.Tee_time_id,
                tt.Date,
                tt.Time,
                gc.Course_name
            FROM TEE_TIME tt
            JOIN GOLF_COURSE gc ON tt.Course_id = gc.Course_id
            JOIN MEMBER_TEE_TIME mtt ON tt.Tee_time_id = mtt.Tee_time_id
            WHERE mtt.Member_id = ? 
            AND tt.Date < CURDATE()
            ORDER BY tt.Date DESC, tt.Time DESC
            LIMIT 10
        `, [req.user.userId]);

        res.json({
            upcoming: upcomingTeeTimes,
            history: teeTimeHistory,
            available: [] // Available tee times will be fetched separately
        });
    } catch (error) {
        console.error("Error fetching member tee times:", error);
        next(error);
    }
});

// Get available tee times for booking
app.get('/api/member/available-tee-times', authenticateToken, async (req, res, next) => {
    // Only allow member access
    if (!req.user || req.user.role !== 'member') {
        return res.status(403).json({ error: 'Access forbidden. Member role required.' });
    }

    const { date } = req.query;
    if (!date) {
        return res.status(400).json({ error: 'Date parameter is required' });
    }

    try {
        // Get available tee times
        const [availableTeeTimes] = await dbPool.query(`
            SELECT 
                tt.Tee_time_id,
                tt.Date,
                tt.Time,
                tt.Available_slots,
                gc.Course_name,
                gc.Course_id
            FROM TEE_TIME tt
            JOIN GOLF_COURSE gc ON tt.Course_id = gc.Course_id
            WHERE tt.Date = ? 
            AND tt.Available_slots > 0
            ORDER BY tt.Time
        `, [date]);

        res.json(availableTeeTimes);
    } catch (error) {
        console.error("Error fetching available tee times:", error);
        next(error);
    }
});

// Book a tee time
app.post('/api/member/book-tee-time', authenticateToken, async (req, res, next) => {
    // Only allow member access
    if (!req.user || req.user.role !== 'member') {
        return res.status(403).json({ error: 'Access forbidden. Member role required.' });
    }

    const { teeTimeId } = req.body;
    if (!teeTimeId) {
        return res.status(400).json({ error: 'Tee time ID is required' });
    }

    try {
        // Start a transaction
        await dbPool.query('START TRANSACTION');

        // Check if tee time is available
        const [teeTime] = await dbPool.query(`
            SELECT Available_slots 
            FROM TEE_TIME 
            WHERE Tee_time_id = ?
        `, [teeTimeId]);

        if (teeTime.length === 0) {
            await dbPool.query('ROLLBACK');
            return res.status(404).json({ error: 'Tee time not found' });
        }

        if (teeTime[0].Available_slots <= 0) {
            await dbPool.query('ROLLBACK');
            return res.status(400).json({ error: 'No available slots for this tee time' });
        }

        // Check if member already booked this tee time
        const [existingBooking] = await dbPool.query(`
            SELECT * FROM MEMBER_TEE_TIME 
            WHERE Member_id = ? AND Tee_time_id = ?
        `, [req.user.userId, teeTimeId]);

        if (existingBooking.length > 0) {
            await dbPool.query('ROLLBACK');
            return res.status(400).json({ error: 'You have already booked this tee time' });
        }

        // Book the tee time
        await dbPool.query(`
            INSERT INTO MEMBER_TEE_TIME (Member_id, Tee_time_id) 
            VALUES (?, ?)
        `, [req.user.userId, teeTimeId]);

        // Update available slots
        await dbPool.query(`
            UPDATE TEE_TIME 
            SET Available_slots = Available_slots - 1 
            WHERE Tee_time_id = ?
        `, [teeTimeId]);

        // Commit the transaction
        await dbPool.query('COMMIT');

        // Get the updated tee time details
        const [updatedTeeTime] = await dbPool.query(`
            SELECT 
                tt.Tee_time_id,
                tt.Date,
                tt.Time,
                gc.Course_name
            FROM TEE_TIME tt
            JOIN GOLF_COURSE gc ON tt.Course_id = gc.Course_id
            WHERE tt.Tee_time_id = ?
        `, [teeTimeId]);

        res.json({
            message: 'Tee time booked successfully',
            teeTime: updatedTeeTime[0]
        });
    } catch (error) {
        // Rollback on error
        await dbPool.query('ROLLBACK');
        console.error("Error booking tee time:", error);
        next(error);
    }
});

// Cancel a tee time
app.post('/api/member/cancel-tee-time', authenticateToken, async (req, res, next) => {
    // Only allow member access
    if (!req.user || req.user.role !== 'member') {
        return res.status(403).json({ error: 'Access forbidden. Member role required.' });
    }

    const { teeTimeId } = req.body;
    if (!teeTimeId) {
        return res.status(400).json({ error: 'Tee time ID is required' });
    }

    try {
        // Start a transaction
        await dbPool.query('START TRANSACTION');

        // Check if member has booked this tee time
        const [booking] = await dbPool.query(`
            SELECT * FROM MEMBER_TEE_TIME 
            WHERE Member_id = ? AND Tee_time_id = ?
        `, [req.user.userId, teeTimeId]);

        if (booking.length === 0) {
            await dbPool.query('ROLLBACK');
            return res.status(404).json({ error: 'Booking not found' });
        }

        // Delete the booking
        await dbPool.query(`
            DELETE FROM MEMBER_TEE_TIME 
            WHERE Member_id = ? AND Tee_time_id = ?
        `, [req.user.userId, teeTimeId]);

        // Update available slots
        await dbPool.query(`
            UPDATE TEE_TIME 
            SET Available_slots = Available_slots + 1 
            WHERE Tee_time_id = ?
        `, [teeTimeId]);

        // Commit the transaction
        await dbPool.query('COMMIT');

        res.json({
            message: 'Tee time cancelled successfully'
        });
    } catch (error) {
        // Rollback on error
        await dbPool.query('ROLLBACK');
        console.error("Error cancelling tee time:", error);
        next(error);
    }
});

// Get equipment data
app.get('/api/member/equipment', authenticateToken, async (req, res, next) => {
    // Only allow member access
    if (!req.user || req.user.role !== 'member') {
        return res.status(403).json({ error: 'Access forbidden. Member role required.' });
    }

    try {
        // Get member ID
        const [members] = await dbPool.query(`
            SELECT m.Member_id
            FROM MEMBER m
            JOIN users u ON LOWER(CONCAT(m.Fname, '.', m.Lname)) = LOWER(u.username)
            WHERE u.username = ?
        `, [req.user.username]);

        if (members.length === 0) {
            return res.status(404).json({ error: 'Member profile not found' });
        }

        const memberId = members[0].Member_id;

        // Get available equipment with rental fees
        const [availableEquipment] = await dbPool.query(`
            SELECT 
                et.Type, 
                et.Rental_fee,
                COUNT(e.Equipment_id) as available
            FROM EQUIPMENT_TYPE et
            LEFT JOIN EQUIPMENT e ON et.Type = e.Type AND e.Availability = TRUE
            GROUP BY et.Type, et.Rental_fee
            ORDER BY et.Type
        `);

        // Get member rentals from EQUIPMENT_RENTAL table
        const [memberRentals] = await dbPool.query(`
            SELECT 
                er.Rental_id,
                et.Type,
                er.Rental_date,
                er.Return_date,
                er.Returned
            FROM EQUIPMENT_RENTAL er
            JOIN EQUIPMENT e ON er.Equipment_id = e.Equipment_id
            JOIN EQUIPMENT_TYPE et ON e.Type = et.Type
            WHERE er.Member_id = ?
            ORDER BY er.Rental_date DESC
        `, [req.user.userId]);

        res.json({
            available: availableEquipment,
            rentals: memberRentals
        });
    } catch (error) {
        console.error("Error fetching equipment data:", error);
        next(error);
    }
});

// Rent equipment
app.post('/api/member/rent-equipment', authenticateToken, async (req, res, next) => {
    // Only allow member access
    if (!req.user || req.user.role !== 'member') {
        return res.status(403).json({ error: 'Access forbidden. Member role required.' });
    }

    const { items } = req.body;
    const memberId = req.user.userId; // Use the authenticated user's ID

    if (!memberId || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Invalid rental data. At least one item is required.' });
    }

    try {
        // Start a transaction
        await dbPool.query('START TRANSACTION');

        // Create array to store the rental results
        const rentalResults = [];

        // For each item in the rental request
        for (const item of items) {
            // Find available equipment of the requested type
            const [availableEquipment] = await dbPool.query(`
                SELECT Equipment_id 
                FROM EQUIPMENT 
                WHERE Type = ? AND Availability = TRUE 
                LIMIT ?
            `, [item.type, item.quantity]);

            // Check if we have enough of this equipment type
            if (availableEquipment.length < item.quantity) {
                // Rollback the transaction
                await dbPool.query('ROLLBACK');
                return res.status(400).json({
                    error: `Not enough ${item.type} available. Requested: ${item.quantity}, Available: ${availableEquipment.length}`
                });
            }

            // Calculate return date (7 days from now)
            const today = new Date();
            const returnDate = new Date(today);
            returnDate.setDate(today.getDate() + 7);

            // For each piece of equipment, create a rental record
            for (const equipment of availableEquipment) {
                // Insert rental record
                const [rentalResult] = await dbPool.query(`
                    INSERT INTO EQUIPMENT_RENTAL (
                        Member_id, Equipment_id, Rental_date, Return_date, Returned
                    ) VALUES (?, ?, CURDATE(), ?, FALSE)
                `, [memberId, equipment.Equipment_id, returnDate.toISOString().split('T')[0]]);

                // Update equipment availability
                await dbPool.query(`
                    UPDATE EQUIPMENT 
                    SET Availability = FALSE 
                    WHERE Equipment_id = ?
                `, [equipment.Equipment_id]);

                // Get the type for the response
                const [typeResult] = await dbPool.query(`
                    SELECT Type FROM EQUIPMENT WHERE Equipment_id = ?
                `, [equipment.Equipment_id]);

                // Add to results
                rentalResults.push({
                    Rental_id: rentalResult.insertId,
                    Type: typeResult[0].Type,
                    Rental_date: today.toISOString().split('T')[0],
                    Return_date: returnDate.toISOString().split('T')[0],
                    Returned: false
                });
            }
        }

        // Commit the transaction
        await dbPool.query('COMMIT');

        res.json({
            message: 'Equipment rented successfully',
            rentals: rentalResults
        });
    } catch (error) {
        // Rollback on error
        await dbPool.query('ROLLBACK');
        console.error("Error renting equipment:", error);
        next(error);
    }
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