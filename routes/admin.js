const express = require("express");
const router = express.Router();
const { requireAuth, requireRole } = require("../middleware/auth");

// Apply auth middleware to all admin routes
router.use(requireAuth);
router.use(requireRole(['admin']));

// Admin dashboard - NEW VERSION with enhanced data
router.get("/dashboard", async (req, res) => {
    try {
        // Get counts for dashboard
        const [studentCount] = await req.pool.promise().query("SELECT COUNT(*) as count FROM student");
        const [lecturerCount] = await req.pool.promise().query("SELECT COUNT(*) as count FROM lecturer");
        const [programCount] = await req.pool.promise().query("SELECT COUNT(*) as count FROM program");
        const [moduleCount] = await req.pool.promise().query("SELECT COUNT(*) as count FROM module");
        
        // Get additional data for charts
        const [bitStudents] = await req.pool.promise().query(`
            SELECT COUNT(*) as count FROM student s
            JOIN student_class_enrollment sce ON s.registration_number = sce.registration_number
            JOIN class c ON sce.class_id = c.class_id
            WHERE c.program_id = 'PBIT'
        `);
        
        const [bisStudents] = await req.pool.promise().query(`
            SELECT COUNT(*) as count FROM student s
            JOIN student_class_enrollment sce ON s.registration_number = sce.registration_number
            JOIN class c ON sce.class_id = c.class_id
            WHERE c.program_id = 'PBIS'
        `);
        
        res.render("admin/dashboard", {
            studentCount: studentCount[0].count,
            lecturerCount: lecturerCount[0].count,
            programCount: programCount[0].count,
            moduleCount: moduleCount[0].count,
            bitStudents: bitStudents[0].count,
            bisStudents: bisStudents[0].count,
            user: req.session.user
        });
    } catch (error) {
        console.error(error);
        res.render("admin/dashboard", {
            studentCount: 0,
            lecturerCount: 0,
            programCount: 0,
            moduleCount: 0,
            bitStudents: 0,
            bisStudents: 0,
            user: req.session.user
        });
    }
});

// NEW: Enhanced manage users page with AJAX support
router.get("/manage-users", async (req, res) => {
    try {
        const [students] = await req.pool.promise().query("SELECT * FROM student");
        const [lecturers] = await req.pool.promise().query("SELECT * FROM lecturer");
        
        res.render("admin/manage-users", { 
            students, 
            lecturers,
            user: req.session.user
        });
    } catch (error) {
        console.error(error);
        res.render("admin/manage-users", { 
            students: [], 
            lecturers: [],
            user: req.session.user
        });
    }
});

// Manage programs
router.get("/manage-programs", async (req, res) => {
    try {
        const [programs] = await req.pool.promise().query("SELECT * FROM program");
        const [classes] = await req.pool.promise().query("SELECT * FROM class");
        const [modules] = await req.pool.promise().query("SELECT * FROM module");
        
        res.render("admin/manage-programs", { 
            programs, 
            classes, 
            modules,
            user: req.session.user
        });
    } catch (error) {
        console.error(error);
        res.render("admin/manage-programs", { 
            programs: [], 
            classes: [], 
            modules: [],
            user: req.session.user
        });
    }
});

// NEW: Enhanced reports page with chart support
router.get("/reports", async (req, res) => {
    try {
        res.render("admin/reports", {
            user: req.session.user
        });
    } catch (error) {
        console.error(error);
        res.render("admin/reports", {
            user: req.session.user
        });
    }
});

module.exports = router;