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