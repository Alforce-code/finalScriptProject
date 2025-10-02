const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();
const { requireAuth, checkUser } = require("../middleware/auth");

// Login page
router.get("/login", (req, res) => {
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
        }
    } else {
        res.render("auth/login", { error: null });
    }
});

// Login handler
router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    
    try {
        // Check if user exists in student table
        const [student] = await req.pool.promise().query(
            "SELECT * FROM student WHERE email = ?", 
            [email]
        );
        
        // Check if user exists in lecturer table
        const [lecturer] = await req.pool.promise().query(
            "SELECT * FROM lecturer WHERE email = ?", 
            [email]
        );
        let user = null;
        let role = null;
        
        if (student.length > 0) {
            user = student[0];
            role = 'student';
        } else if (lecturer.length > 0) {
            user = lecturer[0];
            role = 'lecturer';
        } else if (email === 'admin@mubas.ac.mw') {
            const isPasswordValid = await bcrypt.compare(password, await bcrypt.hash("admin123", 10));
            if (isPasswordValid) {
                user = {
                    first_name: 'Thandazani ',
                    last_name: 'Kaluanda',
                    email: 'admin@mubas.ac.mw'
                };
                role = 'admin';
            }
        }
        
        if (user && role) {
            req.session.user = {
                id: user.registration_number || user.lecturer_id || 'admin',
                firstName: user.first_name,
                lastName: user.last_name,
                email: user.email,
                role: role
            };
            
            switch (role) {
                case 'admin':
                    res.redirect('/admin/dashboard');
                    break;
                case 'lecturer':
                    res.redirect('/lecturer/dashboard');
                    break;
                case 'student':
                    res.redirect('/student/dashboard');
                    break;
            }
        } else {
            res.render("auth/login", { error: "Invalid email or password" });
        }
    } catch (error) {
        console.error(error);
        res.render("auth/login", { error: "An error occurred during login" });
    }
});


// Forgot Password

router.get("/forgot-password", (req, res) => {
    res.render("auth/forgot-password", { error: null, success: null });
});

router.post("/forgot-password", async (req, res) => {
    const { email } = req.body;

    try {
        // Check if email exists in student or lecturer table
        const [student] = await req.pool.promise().query("SELECT * FROM student WHERE email = ?", [email]);
        const [lecturer] = await req.pool.promise().query("SELECT * FROM lecturer WHERE email = ?", [email]);

        if (student.length === 0 && lecturer.length === 0) {
            return res.render("auth/forgot-password", { error: "Email not found", success: null });
        }

        // just simulating a reset link (does not send emails yet)
        const resetLink = "/auth/reset-password"; 
        return res.render("auth/forgot-password", { 
            error: null, 
            success: `Password reset link: ${resetLink}` 
        });

    } catch (err) {
        console.error(err);
        res.render("auth/forgot-password", { error: "Error processing request", success: null });
    }
});

// Change Password
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
        let table = user.role === "student" ? "student" : "lecturer";
        let idField = user.role === "student" ? "registration_number" : "lecturer_id";

        const [rows] = await req.pool.promise().query(
            `SELECT * FROM ${table} WHERE email = ?`, [user.email]
        );

        if (rows.length === 0) {
            return res.render("auth/change-password", { error: "User not found", success: null, user });
        }

        const dbUser = rows[0];

        // Check current password (assuming you’re storing hashed passwords in DB)
        const validPassword = await bcrypt.compare(currentPassword, dbUser.password || "");
        if (!validPassword) {
            return res.render("auth/change-password", { error: "Current password is incorrect", success: null, user });
        }

        // Hash new password and update
        const hashed = await bcrypt.hash(newPassword, 10);
        await req.pool.promise().query(
            `UPDATE ${table} SET password = ? WHERE ${idField} = ?`,
            [hashed, dbUser[idField]]
        );

        res.render("auth/change-password", { error: null, success: "Password changed successfully!", user });
    } catch (err) {
        console.error(err);
        res.render("auth/change-password", { error: "Error changing password", success: null, user });
    }
});



// Register page (for admin only)
router.get("/register", requireAuth, (req, res) => {
    if (req.session.user.role !== 'admin') {
        return res.redirect('/');
    }
    res.render("auth/register", { error: null, success: null });
});

// Register handler (for admin only)
router.post("/register", requireAuth, async (req, res) => {
    if (req.session.user.role !== 'admin') {
        return res.redirect('/');
    }
    
    const { role, firstName, lastName, email, password, registrationNumber, program, year } = req.body;
    
    try {
        if (role === 'student') {
            // Register student
            await req.pool.promise().query(
                "INSERT INTO student (registration_number, first_name, last_name, email, gender) VALUES (?, ?, ?, ?, ?)",
                [registrationNumber, firstName, lastName, email, 'M'] // Default gender to M for demo
            );
            
            // Add to class enrollment
            const classId = `${program}${year}`;
            await req.pool.promise().query(
                "INSERT INTO student_class_enrollment (registration_number, class_id) VALUES (?, ?)",
                [registrationNumber, classId]
            );
        } else if (role === 'lecturer') {
            // Register lecturer
            const lecturerId = `LEC${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
            await req.pool.promise().query(
                "INSERT INTO lecturer (lecturer_id, first_name, last_name, email) VALUES (?, ?, ?, ?)",
                [lecturerId, firstName, lastName, email]
            );
        }
        
        res.render("auth/register", { error: null, success: "User registered successfully" });
    } catch (error) {
        console.error(error);
        res.render("auth/register", { error: "Error registering user", success: null });
    }
});

module.exports = router;