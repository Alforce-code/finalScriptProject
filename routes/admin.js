const express = require("express");
const router = express.Router();
const { requireAuth, requireRole } = require("../middleware/auth");

// Apply auth middleware to all admin routes
router.use(requireAuth);
router.use(requireRole(['admin']));

// Admin dashboard
router.get("/dashboard", async (req, res) => {
    try {
        // Get counts for dashboard
        const [studentCount] = await req.pool.promise().query("SELECT COUNT(*) as count FROM student");
        const [lecturerCount] = await req.pool.promise().query("SELECT COUNT(*) as count FROM lecturer");
        const [programCount] = await req.pool.promise().query("SELECT COUNT(*) as count FROM program");
        const [moduleCount] = await req.pool.promise().query("SELECT COUNT(*) as count FROM module");
        
        res.render("admin/dashboard", {
            studentCount: studentCount[0].count,
            lecturerCount: lecturerCount[0].count,
            programCount: programCount[0].count,
            moduleCount: moduleCount[0].count
        });
    } catch (error) {
        console.error(error);
        res.render("admin/dashboard", {
            studentCount: 0,
            lecturerCount: 0,
            programCount: 0,
            moduleCount: 0
        });
    }
});

// Manage users
router.get("/manage-users", async (req, res) => {
    try {
        const [students] = await req.pool.promise().query("SELECT * FROM student");
        const [lecturers] = await req.pool.promise().query("SELECT * FROM lecturer");
        
        res.render("admin/manage-users", { students, lecturers });
    } catch (error) {
        console.error(error);
        res.render("admin/manage-users", { students: [], lecturers: [] });
    }
});

// Manage programs
router.get("/manage-programs", async (req, res) => {
    try {
        const [programs] = await req.pool.promise().query("SELECT * FROM program");
        const [classes] = await req.pool.promise().query("SELECT * FROM class");
        const [modules] = await req.pool.promise().query("SELECT * FROM module");
        
        res.render("admin/manage-programs", { programs, classes, modules });
    } catch (error) {
        console.error(error);
        res.render("admin/manage-programs", { programs: [], classes: [], modules: [] });
    }
});

// Reports
router.get("/reports", async (req, res) => {
    try {
        // Get students repeating the year (failed 2+ modules)
        const [repeatingStudents] = await req.pool.promise().query(`
            SELECT s.registration_number, s.first_name, s.last_name, 
                   COUNT(CASE WHEN g.score < 50 THEN 1 END) as failed_count
            FROM student s
            JOIN grade g ON s.registration_number = g.registration_number
            GROUP BY s.registration_number, s.first_name, s.last_name
            HAVING failed_count >= 2
        `);
        
        // Get students who passed DMS but failed OS2
        const [dmsPassOsFail] = await req.pool.promise().query(`
            SELECT s.registration_number, s.first_name, s.last_name
            FROM student s
            WHERE EXISTS (
                SELECT 1 FROM grade g 
                JOIN assessment a ON g.assessment_id = a.assessment_id AND g.module_id = a.module_id
                WHERE g.registration_number = s.registration_number 
                AND g.module_id = 'DMS-301'
                AND g.score >= 50
            )
            AND EXISTS (
                SELECT 1 FROM grade g 
                JOIN assessment a ON g.assessment_id = a.assessment_id AND g.module_id = a.module_id
                WHERE g.registration_number = s.registration_number 
                AND g.module_id = 'OPS-302'
                AND g.score < 50
            )
        `);
        
        // Compare performance of females vs males in BIT and BIS for DSA-301
        const [genderPerformance] = await req.pool.promise().query(`
            SELECT s.gender, p.program_id, AVG(g.score) as avg_score
            FROM student s
            JOIN student_class_enrollment sce ON s.registration_number = sce.registration_number
            JOIN class c ON sce.class_id = c.class_id
            JOIN program p ON c.program_id = p.program_id
            JOIN grade g ON s.registration_number = g.registration_number
            WHERE g.module_id = 'DSA-301'
            GROUP BY s.gender, p.program_id
        `);
        
        res.render("admin/reports", {
            repeatingStudents,
            dmsPassOsFail,
            genderPerformance
        });
    } catch (error) {
        console.error(error);
        res.render("admin/reports", {
            repeatingStudents: [],
            dmsPassOsFail: [],
            genderPerformance: []
        });
    }
});

module.exports = router;