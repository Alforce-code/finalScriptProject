const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { requireAuth, requireRole } = require("../middleware/auth");

// Apply auth middleware to all admin routes
router.use(requireAuth);
router.use(requireRole(['admin']));

// ----------------------------- DASHBOARD -----------------------------
router.get("/dashboard", async (req, res) => {
    try {
        const [studentCount] = await req.pool.promise().query("SELECT COUNT(*) as count FROM student");
        const [lecturerCount] = await req.pool.promise().query("SELECT COUNT(*) as count FROM lecturer");
        const [programCount] = await req.pool.promise().query("SELECT COUNT(*) as count FROM program");
        const [moduleCount] = await req.pool.promise().query("SELECT COUNT(*) as count FROM module");

        res.render("admin/dashboard", {
            studentCount: studentCount[0].count,
            lecturerCount: lecturerCount[0].count,
            programCount: programCount[0].count,
            moduleCount: moduleCount[0].count,
            user: req.session.user
        });
    } catch (error) {
        console.error(error);
        res.render("admin/dashboard", {
            studentCount: 0,
            lecturerCount: 0,
            programCount: 0,
            moduleCount: 0,
            user: req.session.user
        });
    }
});

// ----------------------------- LECTURERS -----------------------------
router.get("/lecturer", async (req, res) => {
    try {
        const message = req.session.message || null;
        const messageType = req.session.messageType || null;
        delete req.session.message;
        delete req.session.messageType;

        const [lecturers] = await req.pool.promise().query("SELECT * FROM lecturer ORDER BY lecturer_id");

        res.render("admin/lecturer", { 
            lecturers: lecturers || [],
            message,
            messageType,
            user: req.session.user
        });
    } catch (error) {
        console.error(error);
        res.render("admin/lecturer", { 
            lecturers: [], 
            message: null,
            messageType: null,
            user: req.session.user
        });
    }
});

// Add Lecturer
router.post('/add-lecturer', async (req, res) => {
    try {
        const { lecturer_id, first_name, last_name, email, password } = req.body;

        if (!lecturer_id || !first_name || !last_name || !email || !password) {
            req.session.message = 'All required fields including password must be filled';
            req.session.messageType = 'danger';
            return res.redirect('/admin/lecturer');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const query = 'INSERT INTO lecturer (lecturer_id, first_name, last_name, email, password) VALUES (?, ?, ?, ?, ?)';
        const values = [lecturer_id, first_name, last_name, email, hashedPassword || null];

        await req.pool.promise().query(query, values);

        req.session.message = `Lecturer ${first_name} ${last_name} added successfully`;
        req.session.messageType = 'success';
        res.redirect('/admin/lecturer');
    } catch (error) {
        console.error('Database error:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            if (error.sqlMessage.includes('lecturer_id')) {
                req.session.message = `Lecturer with ID ${req.body.lecturer_id} already exists`;
            } else if (error.sqlMessage.includes('email')) {
                req.session.message = `Lecturer with email ${req.body.email} already exists`;
            } else {
                req.session.message = 'Database error: Duplicate entry';
            }
            req.session.messageType = 'danger';
        } else {
            req.session.message = 'Error adding lecturer to database';
            req.session.messageType = 'danger';
        }
        res.redirect('/admin/lecturer');
    }
});

// Update Lecturer
router.post('/update-lecturer', async (req, res) => {
    try {
        const { lecturer_id, first_name, last_name, email, password} = req.body;

        if (!lecturer_id || !first_name || !last_name || !email) {
            req.session.message = 'All required fields must be filled';
            req.session.messageType = 'danger';
            return res.redirect('/admin/lecturer');
        }

        const [emailResults] = await req.pool.promise().query(
            'SELECT * FROM lecturer WHERE email = ? AND lecturer_id != ?', 
            [email, lecturer_id]
        );
        if (emailResults.length > 0) {
            req.session.message = `Email ${email} is already in use by another lecturer`;
            req.session.messageType = 'danger';
            return res.redirect('/admin/lecturer');
        }

        let updateQuery = 'UPDATE lecturer SET first_name = ?, last_name = ?, email = ?';
        const updateValues = [first_name, last_name, email|| null];

        if (password && password.trim() !== '') {
            const hashedPassword = await bcrypt.hash(password, 10);
            updateQuery += ', password = ?';
            updateValues.push(hashedPassword);
        }

        updateQuery += ' WHERE lecturer_id = ?';
        updateValues.push(lecturer_id);

        const [result] = await req.pool.promise().query(updateQuery, updateValues);

        req.session.message = `Lecturer ${first_name} ${last_name} updated successfully`;
        req.session.messageType = 'success';
        res.redirect('/admin/lecturer');
    } catch (error) {
        console.error('Database error:', error);
        req.session.message = 'Error updating lecturer in database';
        req.session.messageType = 'danger';
        res.redirect('/admin/lecturer');
    }
});

// Delete Lecturer
router.post('/delete-lecturer', async (req, res) => {
    try {
        const { lecturer_id } = req.body;

        if (!lecturer_id) {
            req.session.message = 'Lecturer ID is required';
            req.session.messageType = 'danger';
            return res.redirect('/admin/lecturer');
        }

        const [results] = await req.pool.promise().query(
            'SELECT first_name, last_name FROM lecturer WHERE lecturer_id = ?', 
            [lecturer_id]
        );

        if (results.length === 0) {
            req.session.message = `Lecturer with ID ${lecturer_id} not found`;
            req.session.messageType = 'danger';
            return res.redirect('/admin/lecturer');
        }

        const lecturer = results[0];

        const [result] = await req.pool.promise().query(
            'DELETE FROM lecturer WHERE lecturer_id = ?', 
            [lecturer_id]
        );

        req.session.message = `Lecturer ${lecturer.first_name} ${lecturer.last_name} deleted successfully`;
        req.session.messageType = 'success';
        res.redirect('/admin/lecturer');
    } catch (error) {
        console.error('Database error:', error);
        req.session.message = 'Error deleting lecturer from database';
        req.session.messageType = 'danger';
        res.redirect('/admin/lecturer');
    }
});

// ----------------------------- STUDENTS -----------------------------
router.get("/student", async (req, res) => {
    try {
        const message = req.session.message || null;
        const messageType = req.session.messageType || null;
        delete req.session.message;
        delete req.session.messageType;

        const [students] = await req.pool.promise().query("SELECT * FROM student ORDER BY registration_number");
        const [classes] = await req.pool.promise().query("SELECT * FROM class");
        const [enrollments] = await req.pool.promise().query(`
            SELECT sce.*, c.program_id, c.year 
            FROM student_class_enrollment sce 
            JOIN class c ON sce.class_id = c.class_id 
            ORDER BY sce.registration_number
        `);

        res.render("admin/student", { 
            students: students || [],
            classes: classes || [],
            enrollments: enrollments || [],
            message,
            messageType,
            user: req.session.user
        });
    } catch (error) {
        console.error(error);
        res.render("admin/student", { 
            students: [], 
            classes: [],
            enrollments: [],
            message: null,
            messageType: null,
            user: req.session.user
        });
    }
});

// ----------------------------- PROGRAMS & CLASSES -----------------------------
router.get("/manage-programs", async (req, res) => {
    try {
        const message = req.session.message || null;
        const messageType = req.session.messageType || null;
        delete req.session.message;
        delete req.session.messageType;

        const [programs] = await req.pool.promise().query("SELECT * FROM program ORDER BY program_id");
        const [classes] = await req.pool.promise().query("SELECT * FROM class ORDER BY class_id");
        const [modules] = await req.pool.promise().query("SELECT * FROM module ORDER BY module_id");

        res.render("admin/manage-programs", { 
            programs: programs || [],
            classes: classes || [],
            modules: modules || [],
            message,
            messageType,
            user: req.session.user
        });
    } catch (error) {
        console.error(error);
        res.render("admin/manage-programs", { 
            programs: [], 
            classes: [], 
            modules: [],
            message: null,
            messageType: null,
            user: req.session.user
        });
    }
});

// Add, Update, Delete Programs & Classes (similar to your original logic)
// ... (copy your existing logic for program/class add/update/delete here)

// ----------------------------- DASHBOARD DATA API -----------------------------
router.get("/dashboard-data", async (req, res) => {
    try {
        const [studentResult] = await req.pool.promise().query("SELECT COUNT(*) as count FROM student");
        const [lecturerResult] = await req.pool.promise().query("SELECT COUNT(*) as count FROM lecturer");
        const [programResult] = await req.pool.promise().query("SELECT COUNT(*) as count FROM program");
        const [moduleResult] = await req.pool.promise().query("SELECT COUNT(*) as count FROM module");

        res.json({
            success: true,
            data: {
                studentCount: studentResult[0].count,
                lecturerCount: lecturerResult[0].count,
                programCount: programResult[0].count,
                moduleCount: moduleResult[0].count
            }
        });
    } catch (error) {
        console.error(error);
        res.json({
            success: true,
            data: {
                studentCount: 0,
                lecturerCount: 0,
                programCount: 0,
                moduleCount: 0
            }
        });
    }
});

module.exports = router;
