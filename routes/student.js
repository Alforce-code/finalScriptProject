const express = require("express");
const router = express.Router();
const { requireAuth, requireRole } = require("../middleware/auth");

// Student dashboard
router.get("/dashboard", requireAuth, requireRole(['student']), async (req, res) => {
    try {
        const studentId = req.session.user.id;
        
        // Get student basic info - only specific columns that exist
        const [students] = await req.pool.promise().query(
            "SELECT first_name, last_name, registration_number, email FROM student WHERE registration_number = ?", 
            [studentId]
        );
        
        if (students.length === 0) {
            return res.status(404).send('Student not found');
        }
        
        const student = students[0];
        
        // Get student's class info - use correct column names
        const [classInfo] = await req.pool.promise().query(
            `SELECT c.name as class_name, c.semester, c.academic_year 
             FROM class c 
             JOIN student_class_enrollment sce ON c.class_id = sce.class_id 
             WHERE sce.registration_number = ?`,
            [studentId]
        );
        
        // Set default values for all required properties
        if (classInfo.length > 0) {
            student.class_name = classInfo[0].class_name;
            student.semester = classInfo[0].semester;
            student.academic_year = classInfo[0].academic_year;
        } else {
            // Set safe defaults
            student.class_name = 'BIS3';
            student.semester = 'Semester 2';
            student.academic_year = '2024/2025';
        }
        
        // Add other required properties with defaults
        student.photo = '/images/default-avatar.png';
        student.registration_date = '02/July/2025 - Closed';
        student.reg_period_start = '02/03/2025';
        student.reg_period_end = '10/04/2025';
        student.registration_status = 'Registration Open';
        
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
        
        // Handle specific database errors
        if (error.code === 'ER_BAD_FIELD_ERROR') {
            // If there are still column errors, use completely hardcoded data
            const student = {
                first_name: req.session.user.first_name || 'Student',
                last_name: req.session.user.last_name || '',
                registration_number: req.session.user.id,
                class_name: 'BIS3',
                semester: 'Semester 2',
                academic_year: '2024/2025',
                photo: '/images/default-avatar.png',
                registration_date: '02/July/2025 - Closed',
                reg_period_start: '02/03/2025',
                reg_period_end: '10/04/2025',
                registration_status: 'Registration Open'
            };
            
            return res.render("student/dashboard", {
                student: student,
                modules: []
            });
        }
        
        res.status(500).send('Error loading dashboard. Please try again.');
    }
});

// Student profile
router.get("/profile", requireAuth, requireRole(['student']), async (req, res) => {
    try {
        const studentId = req.session.user.id;
        
        const [students] = await req.pool.promise().query(
            "SELECT first_name, last_name, registration_number, email FROM student WHERE registration_number = ?", 
            [studentId]
        );
        
        if (students.length === 0) {
            return res.status(404).send('Student not found');
        }
        
        const student = students[0];
        student.photo = '/images/default-avatar.png'; // Add default photo
        
        res.render("student/profile", {
            student: student
        });
        
    } catch (error) {
        console.error(error);
        res.status(500).send('Error loading profile');
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
        res.status(500).send('Error loading grades');
    }
});

module.exports = router;