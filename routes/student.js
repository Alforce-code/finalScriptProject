const express = require("express");
const router = express.Router();
const { requireAuth, requireRole } = require("../middleware/auth");

router.use(requireAuth);
router.use(requireRole(['student']));

/**
 * STUDENT DASHBOARD
 */
router.get("/dashboard", async (req, res) => {
    try {
        const studentId = req.session.user.id;

        // Get student info
        const [students] = await req.pool.promise().query(
            "SELECT * FROM student WHERE registration_number = ?", 
            [studentId]
        );
        const student = students[0] || {};

        // Get registered modules
        const [modules] = await req.pool.promise().query(`
            SELECT m.module_code, m.module_name
            FROM module m
            JOIN registration r ON r.module_id = m.module_id
            WHERE r.registration_number = ?
        `, [studentId]);

        // Get notices
        let notices = [];
        try {
            const [rows] = await req.pool.promise().query(`
                SELECT * FROM notices ORDER BY date DESC
            `);
            notices = rows || [];
        } catch (err) {
            console.error("Error fetching notices:", err);
        }

        // Render dashboard
        res.render("student/dashboard", { 
            student,
            modules,
            notices,
            error: null
        });

    } catch (error) {
        console.error("Dashboard error:", error);
        res.render("student/dashboard", { 
            student: {},
            modules: [],
            notices: [], // make sure notices is always defined
            error: "Error loading dashboard"
        });
    }
});

/**
 * STUDENT PROFILE
 */
router.get("/profile", async (req, res) => {
    try {
        const studentId = req.session.user.id;

        const [students] = await req.pool.promise().query(
            "SELECT * FROM student WHERE registration_number = ?", 
            [studentId]
        );
        const student = students[0] || {};

        // Get enrollment info
        const [enrollment] = await req.pool.promise().query(`
            SELECT c.*, p.name as program_name
            FROM class c
            JOIN student_class_enrollment sce ON c.class_id = sce.class_id
            JOIN program p ON c.program_id = p.program_id
            WHERE sce.registration_number = ?
        `, [studentId]);

        res.render("student/profile", {
            student,
            enrollment: enrollment[0] || {},
            error: null
        });

    } catch (error) {
        console.error("Profile error:", error);
        res.render("student/profile", {
            student: {},
            enrollment: {},
            error: "Error loading profile"
        });
    }
});

/**
 * STUDENT GRADES
 */
router.get("/grades", async (req, res) => {
    try {
        const studentId = req.session.user.id;

        const [grades] = await req.pool.promise().query(`
            SELECT g.*, m.name as module_name, a.name as assessment_name, a.weight
            FROM grade g
            JOIN module m ON g.module_id = m.module_id
            LEFT JOIN assessment a ON g.assessment_id = a.assessment_id AND g.module_id = a.module_id
            WHERE g.registration_number = ?
            ORDER BY m.module_id, g.assessment_id
        `, [studentId]);

        // Calculate module averages
        const moduleAverages = {};
        if (grades && grades.length > 0) {
            grades.forEach(grade => {
                if (!moduleAverages[grade.module_id]) {
                    moduleAverages[grade.module_id] = {
                        module_name: grade.module_name,
                        total_score: 0,
                        total_weight: 0,
                        count: 0
                    };
                }
                if (grade.score !== null) {
                    moduleAverages[grade.module_id].total_score += grade.score * ((grade.weight || 100) / 100);
                    moduleAverages[grade.module_id].total_weight += (grade.weight || 100);
                    moduleAverages[grade.module_id].count++;
                }
            });
        }

        const averages = Object.values(moduleAverages).map(module => ({
            module_name: module.module_name,
            average: module.total_weight > 0 ? (module.total_score / module.total_weight) * 100 : 0,
            count: module.count
        }));

        res.render("student/grades", {
            grades: grades || [],
            averages: averages || [],
            error: null
        });

    } catch (error) {
        console.error("Grades error:", error);
        res.render("student/grades", {
            grades: [],
            averages: [],
            error: "Error loading grades"
        });
    }
});

module.exports = router;
