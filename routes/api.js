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

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static("public"));

// Database connection pool
const pool = mysql2.createPool({
    host: "localhost",
    user: "root",
    password: "",
    database: "mubas_assessment_db",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Make pool available to all routes
app.use((req, res, next) => {
    req.pool = pool;
    next();
});

// Middleware
const { requireAuth, checkUser } = require("./middleware/auth");
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
            case 'admin':
                res.redirect('/admin/dashboard');
                break;
            case 'lecturer':
                res.redirect('/lecturer/dashboard');
                break;
            case 'student':
                res.redirect('/student/dashboard');
                break;
            default:
                res.render("auth/login", { error: null });
        }
    } else {
        res.render("auth/login", { error: null });
    }
});

// Logout route
app.get("/logout", (req, res) => {
    req.session.destroy(err => {
        if (err) console.log(err);
        res.redirect("/");
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).send("404 - Page Not Found");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`MUBAS Grading System running on port ${PORT}`);
});
