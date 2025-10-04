const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");

// ------------------------ LOGIN PAGE ------------------------
router.get("/login", (req, res) => {
    if (req.session.user) {
        switch (req.session.user.role) {
            case 'admin':
                return res.redirect('/admin/dashboard');
            case 'lecturer':
                return res.redirect('/lecturer/dashboard');
            case 'student':
                return res.redirect('/student/dashboard');
        }
    }
    res.render("auth/login", { error: null });
});

// ------------------------ LOGIN HANDLER ------------------------
router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        // Check lecturer
        const [lecturerRows] = await req.pool.promise().query(
            "SELECT * FROM lecturer WHERE email = ?", [email]
        );

        // Check student
        const [studentRows] = await req.pool.promise().query(
            "SELECT * FROM student WHERE email = ?", [email]
        );

        let user = null;
        let role = null;

        if (lecturerRows.length > 0) {
            user = lecturerRows[0];
            role = 'lecturer';
        } else if (studentRows.length > 0) {
            user = studentRows[0];
            role = 'student';
        } else if (email === 'admin@mubas.ac.mw') {
            // Admin login (default password: admin123)
            const hashedAdminPassword = await bcrypt.hash("admin123", 10);
            const isPasswordValid = await bcrypt.compare(password, hashedAdminPassword);
            if (isPasswordValid) {
                user = { first_name: "Thandazani", last_name: "Kalua", email: 'admin@mubas.ac.mw' };
                role = 'admin';
            }
        }

        if (!user || !role) {
            return res.render("auth/login", { error: "Invalid email or password" });
        }

        // Compare password for lecturer or student
        if (role !== 'admin') {
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                return res.render("auth/login", { error: "Invalid email or password" });
            }
        }

        // Set session
        req.session.user = {
            id: user.registration_number || user.lecturer_id || 'admin',
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email,
            role: role
        };

        // Redirect by role
        switch (role) {
            case 'admin':
                return res.redirect('/admin/dashboard');
            case 'lecturer':
                return res.redirect('/lecturer/dashboard');
            case 'student':
                return res.redirect('/student/dashboard');
        }
    } catch (err) {
        console.error(err);
        res.render("auth/login", { error: "An error occurred during login" });
    }
});

// ------------------------ FORGOT PASSWORD ------------------------
router.get("/forgot-password", (req, res) => {
    res.render("auth/forgot-password", { error: null, success: null });
});

router.post("/forgot-password", async (req, res) => {
    const { email } = req.body;
    try {
        const [studentRows] = await req.pool.promise().query("SELECT * FROM student WHERE email = ?", [email]);
        const [lecturerRows] = await req.pool.promise().query("SELECT * FROM lecturer WHERE email = ?", [email]);

        if (studentRows.length === 0 && lecturerRows.length === 0) {
            return res.render("auth/forgot-password", { error: "Email not found", success: null });
        }

        const resetLink = "/auth/reset-password"; // Simulated reset link
        return res.render("auth/forgot-password", { error: null, success: `Password reset link: ${resetLink}` });

    } catch (err) {
        console.error(err);
        res.render("auth/forgot-password", { error: "Error processing request", success: null });
    }
});

// ------------------------ CHANGE PASSWORD ------------------------
router.get("/change-password", requireAuth, (req, res) => {
    res.render("auth/change-password", { error: null, success: null, user: req.session.user });
});

router.post("/change-password", requireAuth, async (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const user = req.session.user;

    if (newPassword !== confirmPassword) {
        return res.render("auth/change-password", { error: "Passwords do not match", success: null, user });
    }

    try {
        const table = user.role === "student" ? "student" : "lecturer";
        const idField = user.role === "student" ? "registration_number" : "lecturer_id";

        const [rows] = await req.pool.promise().query(`SELECT * FROM ${table} WHERE email = ?`, [user.email]);
        if (rows.length === 0) {
            return res.render("auth/change-password", { error: "User not found", success: null, user });
        }

        const dbUser = rows[0];
        const validPassword = await bcrypt.compare(currentPassword, dbUser.password || "");
        if (!validPassword) {
            return res.render("auth/change-password", { error: "Current password is incorrect", success: null, user });
        }

        const hashed = await bcrypt.hash(newPassword, 10);
        await req.pool.promise().query(`UPDATE ${table} SET password = ? WHERE ${idField} = ?`, [hashed, dbUser[idField]]);

        res.render("auth/change-password", { error: null, success: "Password changed successfully!", user });

    } catch (err) {
        console.error(err);
        res.render("auth/change-password", { error: "Error changing password", success: null, user });
    }
});

// ------------------------ REGISTER USER (ADMIN ONLY) ------------------------
router.get("/register", requireAuth, (req, res) => {
    if (req.session.user.role !== 'admin') return res.redirect('/');
    res.render("auth/register", { error: null, success: null });
});

router.post("/register", requireAuth, async (req, res) => {
    if (req.session.user.role !== 'admin') return res.redirect('/');

    const { role, firstName, lastName, email, password, registrationNumber, program, year } = req.body;

    try {
        if (!password) {
            return res.render("auth/register", { error: "Password is required", success: null });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        if (role === 'student') {
            await req.pool.promise().query(
                "INSERT INTO student (registration_number, first_name, last_name, email, password) VALUES (?, ?, ?, ?, ?)",
                [registrationNumber, firstName, lastName, email, hashedPassword]
            );

            const classId = `${program}${year}`;
            await req.pool.promise().query(
                "INSERT INTO student_class_enrollment (registration_number, class_id) VALUES (?, ?)",
                [registrationNumber, classId]
            );

        } else if (role === 'lecturer') {
            const lecturerId = `LEC${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
            await req.pool.promise().query(
                "INSERT INTO lecturer (lecturer_id, first_name, last_name, email, password) VALUES (?, ?, ?, ?, ?)",
                [lecturerId, firstName, lastName, email, hashedPassword]
            );
        }

        res.render("auth/register", { error: null, success: "User registered successfully" });

    } catch (err) {
        console.error(err);
        res.render("auth/register", { error: "Error registering user", success: null });
    }
});

module.exports = router;
