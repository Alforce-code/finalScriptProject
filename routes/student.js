const express = require("express");
const router = express.Router();
const { requireAuth, requireRole } = require("../middleware/auth");

// Helper: calculate final grade from [{score, weight}, ...]
// - If weights are present (totalWeight > 0) do weighted average
// - If no weights but there are scores, do simple average
// - If no scores, return null (so EJS can show "N/A")
function calculateFinalGrade(items) {
    if (!items || items.length === 0) return null;

    let totalWeighted = 0;
    let totalWeight = 0;
    let sumScores = 0;
    let countScores = 0;

    items.forEach(it => {
        const score = it.score === null || it.score === undefined ? null : parseFloat(it.score);
        const weight = it.weight === null || it.weight === undefined ? 0 : parseFloat(it.weight) || 0;

        if (!isNaN(score)) {
            sumScores += score;
            countScores++;
            if (!isNaN(weight) && weight > 0) {
                totalWeighted += score * weight;
                totalWeight += weight;
            }
        }
    });

    if (totalWeight > 0) {
        // weighted average: (sum(score * weight) / totalWeight)
        return Number((totalWeighted / totalWeight).toFixed(2));
    }

    // fallback to simple average when weights missing
    if (countScores > 0) {
        return Number((sumScores / countScores).toFixed(2));
    }

    return null;
}

// ------------------ Dashboard ------------------
router.get("/dashboard", requireAuth, requireRole(["student"]), async (req, res) => {
    try {
        const studentId = req.session.user.id;
        const semesterId = req.query.semester || "sem2"; // default semester key

        // 1) student basic info
        const [students] = await req.pool.promise().query(
            `SELECT first_name, last_name, registration_number, email
             FROM student WHERE registration_number = ?`,
            [studentId]
        );
        if (students.length === 0) {
            // Render a friendly page rather than crashing
            return res.status(404).render("student/profile", { student: null, error: "Student not found" });
        }
        const student = students[0];
        student.photo = student.photo || "/images/default-avatar.png";
        student.registration_status = student.registration_status || "Registration Open";

        // 2) student's current class (if any)
        const [classInfo] = await req.pool.promise().query(
            `SELECT c.class_id, c.program_id, c.year
             FROM class c
             JOIN student_class_enrollment sce ON c.class_id = sce.class_id
             WHERE sce.registration_number = ?
             ORDER BY c.year DESC
             LIMIT 1`,
            [studentId]
        );
        if (classInfo.length > 0) {
            student.class_id = classInfo[0].class_id;
            student.program_id = classInfo[0].program_id;
            student.year = classInfo[0].year;
        } else {
            student.class_id = null;
            student.program_id = null;
            student.year = null;
        }

        // 3) modules for the requested semester (class may be null -> empty list)
        let modules = [];
        if (student.class_id) {
            const [mrows] = await req.pool.promise().query(
                `SELECT m.module_id, m.name AS module_name
                 FROM module_class mc
                 JOIN module m ON mc.module_id = m.module_id
                 WHERE mc.class_id = ? AND mc.semester_id = ?
                 ORDER BY m.name ASC`,
                [student.class_id, semesterId]
            );
            modules = mrows;
        }

        // 4) fetch grades and assessment weights for modules in this semester
        // Note: use LEFT JOIN so missing grade/assessment rows do not drop modules
        const gradesData = (student.class_id) ? (await req.pool.promise().query(
            `SELECT m.module_id, m.name AS module_name, mc.semester_id,
                    g.score, a.weight
             FROM module_class mc
             JOIN module m ON mc.module_id = m.module_id
             LEFT JOIN grade g
               ON g.module_id = mc.module_id
               AND g.registration_number = ?
             LEFT JOIN assessment a
               ON a.assessment_id = g.assessment_id
               AND a.module_id = mc.module_id
             WHERE mc.class_id = ? AND mc.semester_id = ?`,
            [studentId, student.class_id, semesterId]
        ))[0] : [];

        // Build a map: module_id -> [{score, weight}, ...]
        const map = {};
        gradesData.forEach(row => {
            const mod = row.module_id;
            if (!map[mod]) map[mod] = [];
            // push score/weight even if score is null (calculate function handles it)
            map[mod].push({ score: row.score, weight: row.weight });
        });

        // 5) compute final_score per module
        const semesterGrades = {};
        semesterGrades[semesterId] = [];

        // Make sure to include modules even if there are no grade rows
        const moduleIdsSeen = new Set();
        modules.forEach(m => {
            moduleIdsSeen.add(m.module_id);
            const items = map[m.module_id] || [];
            const final = calculateFinalGrade(items);
            semesterGrades[semesterId].push({
                module_id: m.module_id,
                module_name: m.module_name,
                final_score: final // numeric or null
            });
        });

        // Also consider modules that had grade rows but were not present in modules (edge case)
        Object.keys(map).forEach(modId => {
            if (!moduleIdsSeen.has(modId)) {
                // find a module name in gradesData
                const sample = gradesData.find(r => r.module_id === modId);
                const final = calculateFinalGrade(map[modId]);
                semesterGrades[semesterId].push({
                    module_id: modId,
                    module_name: sample ? sample.module_name : modId,
                    final_score: final
                });
            }
        });

        // 6) semesters order (desc so sem2 comes before sem1)
        const [semRows] = await req.pool.promise().query(
            `SELECT semester_id FROM semester ORDER BY semester_id DESC`
        );
        const semesterOrder = semRows.map(r => r.semester_id);

        // 7) render
        res.render("student/dashboard", {
            student,
            modules,
            semesterGrades,
            semesters: semesterOrder,
            selectedSemester: semesterId
        });

    } catch (err) {
        console.error("Dashboard error:", err);
        // render a friendly error on dashboard
        return res.status(500).render("student/dashboard", {
            student: null,
            modules: [],
            semesterGrades: {},
            semesters: [],
            selectedSemester: null,
            error: "Error loading dashboard: " + (err.message || err)
        });
    }
});

// ------------------ Profile ------------------
router.get("/profile", requireAuth, requireRole(["student"]), async (req, res) => {
    try {
        const studentId = req.session.user.id;
        const [rows] = await req.pool.promise().query(
            `SELECT first_name, last_name, registration_number, email
             FROM student WHERE registration_number = ? LIMIT 1`,
            [studentId]
        );
        if (!rows || rows.length === 0) {
            return res.status(404).render("student/profile", { student: null, error: "Student not found" });
        }
        const student = rows[0];
        student.photo = student.photo || "/images/default-avatar.png";
        res.render("student/profile", { student, error: null });
    } catch (err) {
        console.error("Profile error:", err);
        res.status(500).render("student/profile", { student: null, error: "Error loading profile" });
    }
});

// ------------------ All Grades Page ------------------
router.get("/grades", requireAuth, requireRole(["student"]), async (req, res) => {
    try {
        const studentId = req.session.user.id;

        // student basic info
        const [students] = await req.pool.promise().query(
            "SELECT first_name, last_name, registration_number, email FROM student WHERE registration_number = ?",
            [studentId]
        );
        if (!students || students.length === 0) {
            return res.status(404).render("student/grades", { student: null, semesterGrades: {}, semesters: [], error: "Student not found" });
        }
        const student = students[0];
        student.photo = student.photo || "/images/default-avatar.png";

        // get class id for this student
        const [[classRow]] = await req.pool.promise().query(
            `SELECT class_id FROM student_class_enrollment WHERE registration_number = ? LIMIT 1`,
            [studentId]
        ).catch(() => [ [undefined] ]);
        const classId = classRow ? classRow.class_id : null;

        // fetch all semester list (desc so sem2 before sem1)
        const [semRows] = await req.pool.promise().query(`SELECT semester_id FROM semester ORDER BY semester_id DESC`);
        const semesterOrder = semRows.map(r => r.semester_id);

        // if no class -> nothing to show
        if (!classId) {
            return res.render("student/grades", { student, semesterGrades: {}, semesters: semesterOrder, error: null });
        }

        // fetch all modules + grade rows for that class
        const [gradesData] = await req.pool.promise().query(
            `SELECT m.module_id, m.name AS module_name, mc.semester_id,
                    g.score, a.weight
             FROM module_class mc
             JOIN module m ON mc.module_id = m.module_id
             LEFT JOIN grade g
               ON g.module_id = mc.module_id
               AND g.registration_number = ?
             LEFT JOIN assessment a
               ON a.assessment_id = g.assessment_id
               AND a.module_id = mc.module_id
             WHERE mc.class_id = ?
             ORDER BY mc.semester_id DESC, m.name ASC`,
            [studentId, classId]
        );

        // group into module per semester, calculate final_score
        const moduleBucket = {}; // key = moduleId::semesterId -> [{score, weight}]
        const sampleInfo = {};   // store module_name / semester_id per key
        gradesData.forEach(r => {
            const key = `${r.module_id}::${r.semester_id}`;
            if (!moduleBucket[key]) moduleBucket[key] = [];
            moduleBucket[key].push({ score: r.score, weight: r.weight });
            sampleInfo[key] = { module_id: r.module_id, module_name: r.module_name, semester_id: r.semester_id };
        });

        const semesterGrades = {};
        Object.keys(moduleBucket).forEach(key => {
            const info = sampleInfo[key];
            const finalScore = calculateFinalGrade(moduleBucket[key]); // number or null
            if (!semesterGrades[info.semester_id]) semesterGrades[info.semester_id] = [];
            semesterGrades[info.semester_id].push({
                module_id: info.module_id,
                module_name: info.module_name,
                final_score: finalScore
            });
        });

        // ensure semesters without modules still exist in object (optional)
        semesterOrder.forEach(s => {
            if (!semesterGrades[s]) semesterGrades[s] = [];
        });

        res.render("student/grades", {
            student,
            semesterGrades,
            semesters: semesterOrder,
            error: null
        });

    } catch (err) {
        console.error("Grades route error:", err);
        res.status(500).render("student/grades", { student: null, semesterGrades: {}, semesters: [], error: "Error loading grades" });
    }
});

module.exports = router;
