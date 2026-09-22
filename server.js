require('dotenv').config(); // Load environment variables from a .env file or the cloud dashboard
const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const session = require('express-session');

const app = express();

// Use the cloud server's assigned port, or default to 3000 locally
const PORT = process.env.PORT || 3000; 

// 1. Configure the Session Middleware system
app.use(session({
    secret: process.env.SESSION_SECRET || 'super-secret-fallback-dev-key', 
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 10 * 60 * 1000, // Session automatically expires after 10 minutes
        secure: process.env.NODE_ENV === 'production' // Uses secure cookies on HTTPS/cloud environments
    }
}));

// 2. 🛡️ Gatekeeper Middleware to protect static files
// Intercepts direct URL entry to home.html and checks for a valid session ticket
app.get('/home.html', (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/index.html'); // Kick them back to login if they aren't authenticated
    }
    next(); // Pass control to the static folder server if authorized
});

// 3. Serve static frontend files (HTML, CSS, JS) from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// 4. 🟢 FIXED ROOT ROUTE: Explicitly maps the base URL '/' to your login page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 5. Create the MySQL Connection Pool (Dynamically falls back to XAMPP locally)
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '', 
    database: process.env.DB_NAME || 'user_system',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
}).promise(); // Promised-based pool for clean async/await syntax

// --- LOGIN ROUTE ---
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Query the database for the provided username
        const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);

        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: "Invalid username or password." });
        }

        const user = rows[0];

        // Securely compare the typed password against the hashed string in the database
        const isMatch = await bcrypt.compare(password, user.password);

        if (isMatch) {
            // Save user details into the server's session state memory
            req.session.user = { id: user.id, username: user.username };
            return res.status(200).json({ success: true, message: "Logged in successfully!" });
        } else {
            return res.status(401).json({ success: false, message: "Invalid username or password." });
        }
    } catch (error) {
        console.error("Login Server Error:", error);
        return res.status(500).json({ success: false, message: "Database server error." });
    }
});

// --- NEW USER REGISTRATION ROUTE ---
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Check if username is already taken in the system
        const [existingUsers] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (existingUsers.length > 0) {
            return res.status(400).json({ success: false, message: "Username is already taken." });
        }

        // Scramble the password using 10 encryption salt rounds
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert the new user row with the encrypted password
        await pool.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);
        
        return res.status(201).json({ success: true, message: "User registered successfully!" });
    } catch (error) {
        console.error("Registration Server Error:", error);
        return res.status(500).json({ success: false, message: "Error registering new user." });
    }
});

// --- LOGOUT ROUTE ---
app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Logout Session Error:", err);
            return res.status(500).json({ message: "Could not log out." });
        }
        res.clearCookie('connect.sid'); // Wipe the session tracking cookie tracking ID out of the browser
        return res.status(200).json({ message: "Logged out safely." });
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Complete Full-Stack System executing on port ${PORT}`);
});
