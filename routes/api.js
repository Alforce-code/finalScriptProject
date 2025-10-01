const express = require("express");
const router = express.Router();
const { requireAuth, checkUser } = require("../middleware/auth");

// Apply checkUser middleware to all API routes
router.use(checkUser);

// Example public API route
router.get("/", (req, res) => {
    res.json({ message: "API root works!" });
});

// Example protected API route
router.get("/secure", requireAuth, (req, res) => {
    res.json({
        message: "You are authenticated!",
        user: req.session.user
    });
});

// Example database query (uses req.pool from app.js)
router.get("/users", requireAuth, (req, res) => {
    req.pool.query("SELECT id, email FROM users", (err, results) => {
        if (err) {
            return res.status(500).json({ error: "Database error" });
        }
        res.json(results);
    });
});

module.exports = router;
