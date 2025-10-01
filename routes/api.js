// routes/api.js
const express = require("express");
const router = express.Router();
<<<<<<< HEAD
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
=======
const { requireAuth, requireRole } = require("../middleware/auth");

// Example API routes - adjust these based on your needs




// Dashboard data endpoint
router.get("/dashboard", async (req, res) => {
    try {
        // Get counts
        const [studentCount] = await req.pool.promise().query('SELECT COUNT(*) as count FROM student');
        const [lecturerCount] = await req.pool.promise().query('SELECT COUNT(*) as count FROM lecturer');
        const [programCount] = await req.pool.promise().query('SELECT COUNT(*) as count FROM program');
        const [moduleCount] = await req.pool.promise().query('SELECT COUNT(*) as count FROM module');
        
        // Get chart data
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
        
        // Get module performance data
        const [modulePerformance] = await req.pool.promise().query(`
            SELECT m.module_id, m.name, AVG(g.score) as avg_score
            FROM module m
            LEFT JOIN grade g ON m.module_id = g.module_id
            GROUP BY m.module_id, m.name
        `);
        
        // Get top students
        const [topStudents] = await req.pool.promise().query(`
            SELECT s.registration_number, 
                   CONCAT(s.first_name, ' ', s.last_name) as name,
                   AVG(g.score) as average_score
            FROM student s
            JOIN grade g ON s.registration_number = g.registration_number
            GROUP BY s.registration_number, s.first_name, s.last_name
            HAVING COUNT(g.score) >= 3
            ORDER BY average_score DESC
            LIMIT 5
        `);
        
        res.json({
            studentCount: studentCount[0].count,
            lecturerCount: lecturerCount[0].count,
            programCount: programCount[0].count,
            moduleCount: moduleCount[0].count,
            chartData: {
                bitStudents: bitStudents[0].count,
                bisStudents: bisStudents[0].count,
                lecturers: lecturerCount[0].count,
                modulesCount: moduleCount[0].count,
                modules: modulePerformance.map(m => m.name),
                averageScores: modulePerformance.map(m => m.avg_score || 0)
            },
            topStudents: topStudents.map(s => ({
                name: s.name,
                averageScore: s.average_score ? s.average_score.toFixed(1) : 'N/A'
            }))
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Students endpoints
router.get("/students", requireRole(['admin']), async (req, res) => {
    try {
        const [students] = await req.pool.promise().query('SELECT * FROM student');
        res.json(students);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post("/students", requireRole(['admin']), async (req, res) => {
    try {
        const { first_name, last_name, email, registration_number, gender } = req.body;
        await req.pool.promise().query(
            'INSERT INTO student (registration_number, first_name, last_name, email, gender) VALUES (?, ?, ?, ?, ?)',
            [registration_number, first_name, last_name, email, gender]
        );
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.delete("/students/:id", requireRole(['admin']), async (req, res) => {
    try {
        await req.pool.promise().query('DELETE FROM student WHERE registration_number = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Lecturers endpoints
router.get("/lecturers", requireRole(['admin']), async (req, res) => {
    try {
        const [lecturers] = await req.pool.promise().query('SELECT * FROM lecturer');
        res.json(lecturers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post("/lecturers", requireRole(['admin']), async (req, res) => {
    try {
        const { first_name, last_name, email, lecturer_id } = req.body;
        await req.pool.promise().query(
            'INSERT INTO lecturer (lecturer_id, first_name, last_name, email) VALUES (?, ?, ?, ?)',
            [lecturer_id, first_name, last_name, email]
        );
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.delete("/lecturers/:id", requireRole(['admin']), async (req, res) => {
    try {
        await req.pool.promise().query('DELETE FROM lecturer WHERE lecturer_id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Modules endpoint
router.get("/modules", requireRole(['admin']), async (req, res) => {
    try {
        const [modules] = await req.pool.promise().query(`
            SELECT m.module_id, m.name, d.name as department_name
            FROM module m
            JOIN department d ON m.department_id = d.department_id
        `);
        res.json(modules);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Grades endpoint
router.get("/grades", requireRole(['admin']), async (req, res) => {
    try {
        const { student } = req.query;
        const [grades] = await req.pool.promise().query(`
            SELECT g.module_id, m.name as module_name, a.name as assessment_name, g.score, a.weight
            FROM grade g
            JOIN module m ON g.module_id = m.module_id
            JOIN assessment a ON g.assessment_id = a.assessment_id AND g.module_id = a.module_id
            WHERE g.registration_number = ?
            ORDER BY m.module_id, a.assessment_id
        `, [student]);
        res.json(grades);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Reports endpoint
router.get("/reports", requireRole(['admin']), async (req, res) => {
    try {
        const { type } = req.query;
        
        let query, title, headers;
        
        switch (type) {
            case 'repeating':
                title = 'Students Repeating Year (Failed 2+ Modules)';
                headers = ['Registration Number', 'First Name', 'Last Name', 'Failed Count'];
                [query] = await req.pool.promise().query(`
                    SELECT s.registration_number, s.first_name, s.last_name, 
                           COUNT(CASE WHEN g.score < 50 THEN 1 END) as failed_count
                    FROM student s
                    JOIN grade g ON s.registration_number = g.registration_number
                    GROUP BY s.registration_number, s.first_name, s.last_name
                    HAVING failed_count >= 2
                `);
                break;
                
            case 'dmsPassOsFail':
                title = 'Students Who Passed DMS but Failed OS2';
                headers = ['Registration Number', 'First Name', 'Last Name'];
                [query] = await req.pool.promise().query(`
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
                break;
                
            case 'genderPerformance':
                title = 'Gender Performance in DSA-301';
                headers = ['Gender', 'Program', 'Average Score'];
                [query] = await req.pool.promise().query(`
                    SELECT s.gender, p.program_id, AVG(g.score) as avg_score
                    FROM student s
                    JOIN student_class_enrollment sce ON s.registration_number = sce.registration_number
                    JOIN class c ON sce.class_id = c.class_id
                    JOIN program p ON c.program_id = p.program_id
                    JOIN grade g ON s.registration_number = g.registration_number
                    WHERE g.module_id = 'DSA-301'
                    GROUP BY s.gender, p.program_id
                `);
                break;
                
            case 'distinction':
                title = 'Students with Distinction Average (70+)';
                headers = ['Registration Number', 'First Name', 'Last Name', 'Average Score'];
                [query] = await req.pool.promise().query(`
                    SELECT s.registration_number, s.first_name, s.last_name, AVG(g.score) as avg_score
                    FROM student s
                    JOIN grade g ON s.registration_number = g.registration_number
                    GROUP BY s.registration_number, s.first_name, s.last_name
                    HAVING avg_score >= 70
                `);
                break;
                
            case 'programModules':
                title = 'Subjects by Program with Lecturers';
                headers = ['Module ID', 'Module Name', 'Programs', 'Lecturers'];
                [query] = await req.pool.promise().query(`
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
                break;
                
            case 'bisGradebook':
                title = 'BIS Gradebook';
                headers = ['Registration Number', 'First Name', 'Last Name', 'Module', 'Assessment', 'Score'];
                [query] = await req.pool.promise().query(`
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
                break;
                
            default:
                return res.status(400).json({ error: 'Invalid report type' });
        }
        
        res.json({
            title,
            headers,
            data: query
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get all students API
router.get("/students", requireAuth, requireRole(['admin', 'lecturer']), async (req, res) => {
    try {
        const [students] = await req.pool.promise().query("SELECT * FROM student");
        res.json(students);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch students" });
    }
});

// Get student by ID API
router.get("/students/:id", requireAuth, async (req, res) => {
    try {
        const [students] = await req.pool.promise().query(
            "SELECT * FROM student WHERE registration_number = ?", 
            [req.params.id]
        );
        
        if (students.length === 0) {
            return res.status(404).json({ error: "Student not found" });
        }
        
        res.json(students[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch student" });
    }
});


// Get courses API
router.get("/courses", requireAuth, async (req, res) => {
    try {
        const [courses] = await req.pool.promise().query("SELECT * FROM course");
        res.json(courses);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch courses" });
    }
});

// routes/api.js - Add these endpoints

// Add student endpoint
router.post("/students", requireRole(['admin']), async (req, res) => {
    try {
        const { first_name, last_name, email, registration_number, gender } = req.body;
        
        // Validate required fields
        if (!first_name || !last_name || !email || !registration_number || !gender) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Check if student already exists
        const [existingStudent] = await req.pool.promise().query(
            'SELECT * FROM student WHERE registration_number = ? OR email = ?',
            [registration_number, email]
        );

        if (existingStudent.length > 0) {
            return res.status(400).json({ error: 'Student with this registration number or email already exists' });
        }

        // Insert new student
        await req.pool.promise().query(
            'INSERT INTO student (registration_number, first_name, last_name, email, gender) VALUES (?, ?, ?, ?, ?)',
            [registration_number, first_name, last_name, email, gender]
        );

        res.json({ success: true, message: 'Student added successfully' });
    } catch (error) {
        console.error('Error adding student:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add lecturer endpoint
router.post("/lecturers", requireRole(['admin']), async (req, res) => {
    try {
        const { first_name, last_name, email, lecturer_id } = req.body;
        
        // Validate required fields
        if (!first_name || !last_name || !email || !lecturer_id) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Check if lecturer already exists
        const [existingLecturer] = await req.pool.promise().query(
            'SELECT * FROM lecturer WHERE lecturer_id = ? OR email = ?',
            [lecturer_id, email]
        );

        if (existingLecturer.length > 0) {
            return res.status(400).json({ error: 'Lecturer with this ID or email already exists' });
        }

        // Insert new lecturer
        await req.pool.promise().query(
            'INSERT INTO lecturer (lecturer_id, first_name, last_name, email) VALUES (?, ?, ?, ?)',
            [lecturer_id, first_name, last_name, email]
        );

        res.json({ success: true, message: 'Lecturer added successfully' });
    } catch (error) {
        console.error('Error adding lecturer:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete student endpoint
router.delete("/students/:id", requireRole(['admin']), async (req, res) => {
    try {
        const registrationNumber = req.params.id;
        
        // Check if student exists
        const [existingStudent] = await req.pool.promise().query(
            'SELECT * FROM student WHERE registration_number = ?',
            [registrationNumber]
        );

        if (existingStudent.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }

        // Delete student (this will cascade to related tables if foreign keys are set up properly)
        await req.pool.promise().query(
            'DELETE FROM student WHERE registration_number = ?',
            [registrationNumber]
        );

        res.json({ success: true, message: 'Student deleted successfully' });
    } catch (error) {
        console.error('Error deleting student:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete lecturer endpoint
router.delete("/lecturers/:id", requireRole(['admin']), async (req, res) => {
    try {
        const lecturerId = req.params.id;
        
        // Check if lecturer exists
        const [existingLecturer] = await req.pool.promise().query(
            'SELECT * FROM lecturer WHERE lecturer_id = ?',
            [lecturerId]
        );

        if (existingLecturer.length === 0) {
            return res.status(404).json({ error: 'Lecturer not found' });
        }

        // Delete lecturer
        await req.pool.promise().query(
            'DELETE FROM lecturer WHERE lecturer_id = ?',
            [lecturerId]
        );

        res.json({ success: true, message: 'Lecturer deleted successfully' });
    } catch (error) {
        console.error('Error deleting lecturer:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Add more API routes as needed...

module.exports = router;
>>>>>>> 9d86464bcd6bc3c0152ebc8555d3834293a7fea6
