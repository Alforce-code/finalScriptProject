const express = require("express");
const router = express.Router();
const { requireAuth, requireRole } = require("../middleware/auth");

// Student dashboard
router.get("/dashboard", requireAuth, requireRole(['student']), async (req, res) => {
    try {
        const studentId = req.session.user.id;
        
        // Get student basic info
        const [students] = await req.pool.promise().query(
            "SELECT * FROM student WHERE registration_number = ?", 
            [studentId]
        );
        
        if (students.length === 0) {
            return res.status(404).render('error', { message: 'Student not found' });
        }
        
        const student = students[0];
        
        // Get student's class info
        const [classInfo] = await req.pool.promise().query(
            `SELECT c.class_name, c.semester, c.academic_year 
             FROM class c 
             JOIN student_class_enrollment sce ON c.class_id = sce.class_id 
             WHERE sce.registration_number = ?`,
            [studentId]
        );
        
        if (classInfo.length > 0) {
            student.class_name = classInfo[0].class_name;
            student.semester = classInfo[0].semester;
            student.academic_year = classInfo[0].academic_year;
        }
        
        // Get student's enrolled modules
        const [modules] = await req.pool.promise().query(
            `SELECT m.module_code, m.module_name, m.credits 
             FROM module m 
             JOIN class_module cm ON m.module_code = cm.module_code 
             JOIN student_class_enrollment sce ON cm.class_id = sce.class_id 
             WHERE sce.registration_number = ?`,
            [studentId]
        );
        
        res.render("student/dashboard", {
            student: student,
            modules: modules
        });
        
    } catch (error) {
        console.error("Dashboard error:", error);
        res.status(500).render('error', { message: 'Error loading dashboard' });
    }
});

// Student profile
router.get("/profile", requireAuth, requireRole(['student']), async (req, res) => {
    try {
        const studentId = req.session.user.id;
        
        const [students] = await req.pool.promise().query(
            "SELECT * FROM student WHERE registration_number = ?", 
            [studentId]
        );
        
        if (students.length === 0) {
            return res.status(404).render('error', { message: 'Student not found' });
        }
        
        res.render("student/profile", {
            student: students[0]
        });
        
    } catch (error) {
        console.error(error);
        res.status(500).render('error', { message: 'Error loading profile' });
    }
});

// Student grades
router.get("/grades", requireAuth, requireRole(['student']), async (req, res) => {
    try {
        const studentId = req.session.user.id;
        
        // Get grades with module info
        const [grades] = await req.pool.promise().query(
            `SELECT m.module_code, m.module_name, g.coursework_marks, g.exam_marks, g.final_grade 
             FROM grade g 
             JOIN module m ON g.module_code = m.module_code 
             WHERE g.registration_number = ?`,
            [studentId]
        );
        
        res.render("student/grades", {
            grades: grades,
            student: req.session.user
        });
        
    } catch (error) {
        console.error(error);
        res.status(500).render('error', { message: 'Error loading grades' });
    }
});

module.exports = router;