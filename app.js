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

// Home route
app.get("/", (req, res) => {
    if (req.session.user) {
        switch (req.session.user.role) {
            case 'admin': return res.redirect('/admin/dashboard');
            case 'lecturer': return res.redirect('/lecturer/dashboard');
            case 'student': return res.redirect('/student/dashboard');
            default: return res.render("auth/login", { error: null });
        }
    }
    res.render("auth/login", { error: null });
});

// ✅ Logout route
app.get("/logout", (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.log('Logout error:', err);s
        }
        res.clearCookie('connect.sid'); // remove session cookie
        res.redirect("/"); // redirect to login/home
    });
});

// Simple 404 handler
app.use((req, res) => {
    res.status(404).render('404'); // optional: use a 404.ejs page
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
