require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Create MySQL connection
const db = mysql.createConnection({
    host: '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Remy1009935$!',
    database: process.env.DB_NAME || 'GolfCourseDB',
    connectTimeout: 10000, // 10 seconds
});

// Variable to track database connection status
let dbConnected = false;

// Connect to MySQL
const connectToDatabase = () => {
    db.connect(err => {
        if (err) {
            console.error('Error connecting to MySQL database:', err);
            console.log('Server will continue running, but database operations will not work.');
            dbConnected = false;
            return;
        }
        console.log('Connected to MySQL database');
        dbConnected = true;
    });
};

// Attempt initial connection
connectToDatabase();

// Middleware to check database connection before processing requests
const checkDbConnection = (req, res, next) => {
    if (!dbConnected && req.path.startsWith('/api/')) {
        return res.status(503).json({
            error: 'Database connection is not available',
            message: 'Please make sure your MySQL server is running and the database is created.'
        });
    }
    next();
};

app.use(checkDbConnection);

// API Routes

// Get all tables in the database
app.get('/api/tables', (req, res) => {
    const query = "SHOW TABLES";
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching tables:', err);
            return res.status(500).json({ error: 'Error fetching tables' });
        }
        const tables = results.map(row => Object.values(row)[0]);
        res.json(tables);
    });
});

// Get table structure
app.get('/api/tables/:tableName/structure', (req, res) => {
    const tableName = req.params.tableName;
    const query = `DESCRIBE ${tableName}`;
    db.query(query, (err, results) => {
        if (err) {
            console.error(`Error fetching structure for table ${tableName}:`, err);
            return res.status(500).json({ error: `Error fetching structure for table ${tableName}` });
        }
        res.json(results);
    });
});

// Get data from a specific table
app.get('/api/tables/:tableName', (req, res) => {
    const tableName = req.params.tableName;
    const query = `SELECT * FROM ${tableName}`;
    db.query(query, (err, results) => {
        if (err) {
            console.error(`Error fetching data from table ${tableName}:`, err);
            return res.status(500).json({ error: `Error fetching data from table ${tableName}` });
        }
        res.json(results);
    });
});

// Insert data into a table
app.post('/api/tables/:tableName', (req, res) => {
    const tableName = req.params.tableName;
    const data = req.body;

    // Remove any fields with empty values
    Object.keys(data).forEach(key => {
        if (data[key] === '' || data[key] === null || data[key] === undefined) {
            delete data[key];
        }
    });

    if (Object.keys(data).length === 0) {
        return res.status(400).json({ error: 'No valid data provided for insertion' });
    }

    const query = `INSERT INTO ${tableName} SET ?`;
    db.query(query, data, (err, results) => {
        if (err) {
            console.error(`Error inserting data into table ${tableName}:`, err);
            return res.status(500).json({ error: `Error inserting data: ${err.message}` });
        }
        res.json({
            message: `Data inserted successfully into ${tableName}`,
            insertId: results.insertId
        });
    });
});

// Delete data from a table
app.delete('/api/tables/:tableName/:id', (req, res) => {
    const tableName = req.params.tableName;
    const id = req.params.id;
    const primaryKeyName = req.query.primaryKey || `${tableName}_id`;

    const query = `DELETE FROM ${tableName} WHERE ${primaryKeyName} = ?`;
    db.query(query, [id], (err, results) => {
        if (err) {
            console.error(`Error deleting data from table ${tableName}:`, err);
            return res.status(500).json({ error: `Error deleting data: ${err.message}` });
        }

        if (results.affectedRows === 0) {
            return res.status(404).json({ error: `Record with ID ${id} not found in ${tableName}` });
        }

        res.json({
            message: `Data deleted successfully from ${tableName}`,
            affectedRows: results.affectedRows
        });
    });
});

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser to use the application`);
}); 