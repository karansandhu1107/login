require('dotenv').config(); // 🟢 Load cloud environment configurations
const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const session = require('express-session');

const app = express();
// 🟢 Use the cloud server's assigned port, or default to 3000 locally
const PORT = process.env.PORT || 3000; 

// Configure Session Middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-dev-key', // Secure secret from env
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 10 * 60 * 1000 }
}));

// ... [Keep your middleware gatekeeper and routing logic exactly the same] ...

// 🟢 Dynamically connect to either XAMPP locally or our Cloud Database
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '', 
    database: process.env.DB_NAME || 'user_system',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
}).promise();

// ... [Keep your login, register, and logout routes exactly the same] ...

app.listen(PORT, () => {
    console.log(`🚀 App is live and listening on port ${PORT}`);
});

// --- LOGIN ROUTE (UPDATED FOR SESSIONS) ---
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: "Invalid username or password." });
        }
        const user = rows[0];

        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
            // 🟢 Save user details into the server's session memory state!
            req.session.user = { id: user.id, username: user.username };
            return res.status(200).json({ success: true, message: "Logged in successfully!" });
        } else {
            return res.status(401).json({ success: false, message: "Invalid username or password." });
        }
    } catch (error) {
        return res.status(500).json({ success: false, message: "Database server error." });
    }
});

// --- NEW USER REGISTRATION ROUTE ---
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [existingUsers] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (existingUsers.length > 0) {
            return res.status(400).json({ success: false, message: "Username is already taken." });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);
        return res.status(201).json({ success: true, message: "User registered successfully!" });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Error registering user." });
    }
});

// --- LOGOUT ROUTE ---
app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).json({ message: "Could not log out." });
        res.clearCookie('connect.sid'); // Remove session tracking ID token from browser cookie
        return res.status(200).json({ message: "Logged out safely." });
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Complete Secure Full-Stack Application deployed at http://localhost:${PORT}`);
});
