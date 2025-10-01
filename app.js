const express = require("express");
const mysql2 = require("mysql2");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const path = require("path");
const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

app.use(session({
    secret: 'mubas-assessment-secret-key-2025',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Set view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static("public"));

// DB connection pool
const pool = mysql2.createPool({
    host: "localhost",
    user: "root",
    password: "",
    database: "mubas_assessment_db",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Make pool available in all routes
app.use((req, res, next) => {
    req.pool = pool;
    next();
});

// Auth middleware
const { requireAuth, requireRole, checkUser } = require("./middleware/auth");
app.use(checkUser);

// Routes
app.use("/auth", require("./routes/auth"));
app.use("/admin", require("./routes/admin"));
app.use("/lecturer", require("./routes/lecturer"));
app.use("/student", require("./routes/student"));
app.use("/api", require("./routes/api"));

// ✅ FIXED: Single root route - Remove duplicate routes
app.get('/', (req, res) => {
    // If user is already logged in, redirect to their dashboard
    if (req.session.user) {
        switch (req.session.user.role) {
            case 'admin': return res.redirect('/admin/dashboard');
            case 'lecturer': return res.redirect('/lecturer/dashboard');
            case 'student': return res.redirect('/student/dashboard');
            default: return res.render("landing");
        }
    }
    // If not logged in, show the landing page
    res.render("landing");
});

// ✅ FIXED: Logout route - redirect to root (landing page)
app.get("/logout", (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.log('Logout error:', err);
        }
        res.clearCookie('connect.sid');
        res.redirect("/"); // ✅ FIXED: Redirect to root (landing page) after logout
    });
});

// ✅ FIXED: Simple 404 handler
app.use((req, res) => {
    res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Page Not Found</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    text-align: center; 
                    padding: 50px; 
                    background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
                    color: white;
                }
                h1 { font-size: 48px; margin-bottom: 20px; }
                a { color: #4fc3f7; text-decoration: none; }
            </style>
        </head>
        <body>
            <h1>404</h1>
            <h2>Page Not Found</h2>
            <p>The page you are looking for doesn't exist.</p>
            <a href="/">Back to Home</a>
        </body>
        </html>
    `);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`MUBAS Grading System running on port ${PORT}`);
    console.log(`Landing page: http://localhost:${PORT}`);
});