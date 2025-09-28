const express = require("express");
const router = express.Router();
const { requireAuth, requireRole } = require("../middleware/auth");

// Apply auth middleware to all lecturer routes
router.use(requireAuth);
router.use(requireRole(['lecturer']));

// Lecturer dashboard
router.get("/dashboard", async (req, res) => {
    try {
        const lecturerId = req.session.user.id;
        
        // Get modules taught by this lecturer
        const [modules] = await req.pool.promise().query(`
            SELECT m.module_id, m.name 
            FROM module m
            JOIN lecturer_module lm ON m.module_id = lm.module_id
            WHERE lm.lecturer_id = ?
        `, [lecturerId]);
        
        // Get recent grades for these modules
        let recentGrades = [];
        if (modules.length > 0) {
            const moduleIds = modules.map(m => m.module_id);
            const placeholders = moduleIds.map(() => '?').join(',');
            
            const [grades] = await req.pool.promise().query(`
                SELECT g.*, s.first_name, s.last_name, m.name as module_name, a.name as assessment_name
                FROM grade g
                JOIN student s ON g.registration_number = s.registration_number
                JOIN module m ON g.module_id = m.module_id
                JOIN assessment a ON g.assessment_id = a.assessment_id AND g.module_id = a.module_id
                WHERE g.module_id IN (${placeholders})
                ORDER BY g.grade_id DESC
                LIMIT 10
            `, moduleIds);
            
            recentGrades = grades;
        }
        
        res.render("lecturer/dashboard", { modules, recentGrades });
    } catch (error) {
        console.error(error);
        res.render("lecturer/dashboard", { modules: [], recentGrades: [] });
    }
});

// Manage grades
router.get("/manage-grades", async (req, res) => {
    try {
        const lecturerId = req.session.user.id;
        
        // Get modules taught by this lecturer
        const [modules] = await req.pool.promise().query(`
            SELECT m.module_id, m.name 
            FROM module m
            JOIN lecturer_module lm ON m.module_id = lm.module_id
            WHERE lm.lecturer_id = ?
        `, [lecturerId]);
        
        // Get students for these modules
        let students = [];
        if (modules.length > 0) {
            const moduleIds = modules.map(m => m.module_id);
            const placeholders = moduleIds.map(() => '?').join(',');
            
            const [studentData] = await req.pool.promise().query(`
                SELECT DISTINCT s.registration_number, s.first_name, s.last_name, m.module_id, m.name as module_name
                FROM student s
                JOIN student_class_enrollment sce ON s.registration_number = sce.registration_number
                JOIN module_class mc ON sce.class_id = mc.class_id
                JOIN module m ON mc.module_id = m.module_id
                WHERE m.module_id IN (${placeholders})
            `, moduleIds);
            
            students = studentData;
        }
        
        res.render("lecturer/manage-grades", { modules, students });
    } catch (error) {
        console.error(error);
        res.render("lecturer/manage-grades", { modules: [], students: [] });
    }
});

// Update grade
router.post("/update-grade", async (req, res) => {
    try {
        const { registrationNumber, moduleId, assessmentId, score } = req.body;
        
        // Check if grade exists
        const [existingGrade] = await req.pool.promise().query(`
            SELECT * FROM grade 
            WHERE registration_number = ? AND module_id = ? AND assessment_id = ?
        `, [registrationNumber, moduleId, assessmentId]);
        
        if (existingGrade.length > 0) {
            // Update existing grade
            await req.pool.promise().query(`
                UPDATE grade SET score = ? 
                WHERE registration_number = ? AND module_id = ? AND assessment_id = ?
            `, [score, registrationNumber, moduleId, assessmentId]);
        } else {
            // Insert new grade
            await req.pool.promise().query(`
                INSERT INTO grade (registration_number, module_id, assessment_id, score)
                VALUES (?, ?, ?, ?)
            `, [registrationNumber, moduleId, assessmentId, score]);
        }
        
        res.json({ success: true, message: "Grade updated successfully" });
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: "Error updating grade" });
    }
});

// Reports and queries
router.get("/reports", async (req, res) => {
    try {
        // Students repeating the year (failed 2+ modules)
        const [repeatingStudents] = await req.pool.promise().query(`
            SELECT s.registration_number, s.first_name, s.last_name, 
                   COUNT(CASE WHEN g.score < 50 THEN 1 END) as failed_count
            FROM student s
            JOIN grade g ON s.registration_number = g.registration_number
            GROUP BY s.registration_number, s.first_name, s.last_name
            HAVING failed_count >= 2
        `);
        
        // Students who passed DMS but failed OS2
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
        
        // Students with distinction average (70+)
        const [distinctionStudents] = await req.pool.promise().query(`
            SELECT s.registration_number, s.first_name, s.last_name, AVG(g.score) as avg_score
            FROM student s
            JOIN grade g ON s.registration_number = g.registration_number
            GROUP BY s.registration_number, s.first_name, s.last_name
            HAVING avg_score >= 70
        `);
        
        // Subjects taught in BIT only, BIS only, or both with lecturers
        const [programModules] = await req.pool.promise().query(`
            SELECT m.module_id, m.name as module_name, 
                   GROUP_CONCAT(DISTINCT p.program_id) as programs,
                   GROUP_CONCAT(DISTINCT CONCAT(l.first_name, ' ', l.last_name)) as lecturers
            FROM module m
            LEFT JOIN program_module pm ON m.module_id = pm.module_id
            LEFT JOIN program p ON pm.program_id = p.program_id
            LEFT JOIN lecturer_module lm ON m.module_id = lm.module_id
            LEFT JOIN lecturer l ON lm.lecturer_id = l.lecturer_id
            GROUP BY m.module_id, m.name
            ORDER BY programs
        `);
        
        // Grade book for BIS students
        const [bisGradebook] = await req.pool.promise().query(`
            SELECT s.registration_number, s.first_name, s.last_name, 
                   m.module_id, m.name as module_name, g.score, a.name as assessment_name
            FROM student s
            JOIN student_class_enrollment sce ON s.registration_number = sce.registration_number
            JOIN class c ON sce.class_id = c.class_id
            JOIN program p ON c.program_id = p.program_id
            JOIN module_class mc ON c.class_id = mc.class_id
            JOIN module m ON mc.module_id = m.module_id
            LEFT JOIN grade g ON s.registration_number = g.registration_number AND m.module_id = g.module_id
            LEFT JOIN assessment a ON g.assessment_id = a.assessment_id AND g.module_id = a.module_id
            WHERE p.program_id = 'PBIS'
            ORDER BY s.registration_number, m.module_id
        `);
        
        res.render("lecturer/reports", {
            repeatingStudents,
            dmsPassOsFail,
            genderPerformance,
            distinctionStudents,
            programModules,
            bisGradebook
        });
    } catch (error) {
        console.error(error);
        res.render("lecturer/reports", {
            repeatingStudents: [],
            dmsPassOsFail: [],
            genderPerformance: [],
            distinctionStudents: [],
            programModules: [],
            bisGradebook: []
        });
    }
});

module.exports = router;