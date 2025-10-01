const express = require("express");
const router = express.Router();
const { requireAuth, requireRole } = require("../middleware/auth");

// Apply auth middleware to all lecturer routes
router.use(requireAuth);
router.use(requireRole(['lecturer']));

// Helper: Ensure session user exists
function getLecturerId(req, res) {
    if (!req.session.user) {
        res.redirect("/login");
        return null;
    }
    return req.session.user.id;
}

// Dashboard
router.get("/dashboard", async (req, res) => {
    try {
        const lecturerId = getLecturerId(req, res);
        if (!lecturerId) return;

        const [modules] = await req.pool.promise().query(`
            SELECT m.module_id, m.name 
            FROM module m
            JOIN lecturer_module lm ON m.module_id = lm.module_id
            WHERE lm.lecturer_id = ?
        `, [lecturerId]);

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
        res.render("lecturer/dashboard", { modules: [], recentGrades: [], error: "Failed to load dashboard" });
    }
});

// Manage Grades
router.get("/manage-grades", async (req, res) => {
    try {
        const lecturerId = getLecturerId(req, res);
        if (!lecturerId) return;

        // Get modules taught
        const [modules] = await req.pool.promise().query(`
            SELECT m.module_id, m.name 
            FROM module m
            JOIN lecturer_module lm ON m.module_id = lm.module_id
            WHERE lm.lecturer_id = ?
        `, [lecturerId]);

        const selectedModule = req.query.moduleId || (modules[0] ? modules[0].module_id : null);

        let students = [];
        let assessments = [];
        let classAverage = null;

        if (selectedModule) {
            // Students
            const [studentData] = await req.pool.promise().query(`
                SELECT DISTINCT s.registration_number, s.first_name, s.last_name
                FROM student s
                JOIN student_class_enrollment sce ON s.registration_number = sce.registration_number
                JOIN module_class mc ON sce.class_id = mc.class_id
                WHERE mc.module_id = ?
            `, [selectedModule]);
            students = studentData;

            // Assessments
            const [assessmentData] = await req.pool.promise().query(`
                SELECT assessment_id, name 
                FROM assessment
                WHERE module_id = ?
            `, [selectedModule]);
            assessments = assessmentData;

            // Compute grades and overall score
            for (let s of students) {
                const [grades] = await req.pool.promise().query(`
                    SELECT g.assessment_id, g.score 
                    FROM grade g
                    WHERE g.registration_number = ? AND g.module_id = ?
                `, [s.registration_number, selectedModule]);

                s.grades = grades;

                if (grades.length > 0) {
                    const total = grades.reduce((sum, g) => sum + (Number(g.score) || 0), 0);
                    s.overall_score = Math.round(total / grades.length);
                } else {
                    s.overall_score = null;
                }
            }

            // Class average
            const validScores = students
                .map(s => s.overall_score)
                .filter(score => score !== null);

            if (validScores.length > 0) {
                const totalClass = validScores.reduce((sum, sc) => sum + sc, 0);
                classAverage = Math.round(totalClass / validScores.length);
            }
        }

        // Prepare average style for EJS
        let avgStyle = "";
        if (classAverage !== null) {
            if (classAverage >= 70) avgStyle = "color:#155724;background:#d4edda;";
            else if (classAverage >= 50) avgStyle = "color:#856404;background:#fff3cd;";
            else avgStyle = "color:#721c24;background:#f8d7da;";
        }

        res.render("lecturer/manage-grades", { 
            modules, selectedModule, students, assessments, classAverage, avgStyle 
        });

    } catch (error) {
        console.error(error);
        res.render("lecturer/manage-grades", { 
            modules: [], selectedModule: null, students: [], assessments: [], classAverage: null, avgStyle: "",
            error: "Error loading manage grades"
        });
    }
});

// Update Grade (Save button)
router.post("/update-grade", async (req, res) => {
    try {
        const { registrationNumber, moduleId, assessmentId, score } = req.body;
        const numericScore = Number(score);

        if (isNaN(numericScore)) throw new Error("Score must be a number");

        const [existing] = await req.pool.promise().query(
            `SELECT * FROM grade 
             WHERE registration_number = ? AND module_id = ? AND assessment_id = ?`,
            [registrationNumber, moduleId, assessmentId]
        );

        if (existing.length > 0) {
            await req.pool.promise().query(
                `UPDATE grade SET score = ? 
                 WHERE registration_number = ? AND module_id = ? AND assessment_id = ?`,
                [numericScore, registrationNumber, moduleId, assessmentId]
            );
        } else {
            await req.pool.promise().query(
                `INSERT INTO grade (registration_number, module_id, assessment_id, score)
                 VALUES (?, ?, ?, ?)`,
                [registrationNumber, moduleId, assessmentId, numericScore]
            );
        }

        res.redirect(`/lecturer/manage-grades?moduleId=${moduleId}`);
    } catch (error) {
        console.error(error);
        res.redirect(`/lecturer/manage-grades?moduleId=${req.body.moduleId}`);
    }
});

// Delete Grade
router.post("/delete-grade", async (req, res) => {
    try {
        const { registrationNumber, moduleId, assessmentId } = req.body;
        await req.pool.promise().query(
            `DELETE FROM grade 
             WHERE registration_number = ? AND module_id = ? AND assessment_id = ?`,
            [registrationNumber, moduleId, assessmentId]
        );
        res.redirect(`/lecturer/manage-grades?moduleId=${moduleId}`);
    } catch (error) {
        console.error(error);
        res.redirect(`/lecturer/manage-grades?moduleId=${req.body.moduleId}`);
    }
});

// Reports (kept as is)
router.get("/reports", async (req, res) => {
    try {
        // Your existing reports queries here...
        res.render("lecturer/reports", {
            repeatingStudents: [], dmsPassOsFail: [], genderPerformance: [],
            distinctionStudents: [], programModules: [], bisGradebook: []
        });
    } catch (error) {
        console.error(error);
        res.render("lecturer/reports", {
            repeatingStudents: [], dmsPassOsFail: [], genderPerformance: [],
            distinctionStudents: [], programModules: [], bisGradebook: [],
            error: "Error loading reports"
        });
    }
});

module.exports = router;
