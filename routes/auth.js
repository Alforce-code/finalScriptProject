const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");

// ------------------------ DEFAULT PASSWORDS ------------------------
const defaultLecturerPasswords = {
    "bis21-mtembo@mubas.ac.mw": "@mtembo",
    "bis22-mhango@mubas.ac.mw": "@mhango",
    "mchinguwo@mubas.ac.mw": "@mchinguo",
    "mmsendema@mubas.ac.mw": "@msendema",
    "gfrancis@mubas.ac.mw": "@gfrancis",
    "minusa@mubas.ac.mw": "@minusa",
    "bis22-fhussein@mubas.ac.mw": "@fhussein",
    "bit22-tnsiku@mubas.ac.mw": "@tnsiku",
    "hchilunga@mubas.ac.mw": "@hchilunga",
    "tkalua@mubas.ac.mw": "@tkalua",
    "kvitumbiko@mubas.ac.mw": "@kvitumbiko",
    "bis22-mkalua@mubas.ac.mw": "@mkalua",
    "kombi@mubas.ac.mw": "@kombi",
    "vitukombi@mubas.ac.mw": "@vitumbiko",
    "ekamwendo@mubas.ac.mw": "@ekamwendo",
    "kthkkn@mubas.ac.mw": "@khawa",
    "bis22-mclement@mubas.ac.mw": "@mclement",
    "abishayi@mubas.ac.mw": "@abishayi",
    "gnyirenda@mubas.ac.mw": "@gnyirenda",
    "ataylor@mubas.ac.mw": "@ataylor",
    "abanda@mubas.ac.mw": "@abanda",
    "dmkavea@mubas.ac.mw": "@dmkavea",
    "mnkonjo@mubas.ac.mw": "@mmkonjo",
    "bis22-mkoyin@mubas.ac.mw": "@mkoyin",
    "dmunthali@mubas.ac.mw": "@dmunthali"
};

const defaultStudentPasswords = {
    "kalua.alforcet@gmail.com": "@alforce",
    "bis16-mkumilonde@mubas.ac.mw": "@mkumilonde",
    "bis18-wgeofrey@mubas.ac.mw": "@wgeofrey",
    "bis19-pkulinji@mubas.ac.mw": "@pkulinji",
    "bis19-slundu@mubas.ac.mw": "@slundu",
    "bis20-mkaipa@mubas.ac.mw": "@mkaipa",
    "bis20-mkabvalo@mubas.ac.mw": "@mkabvalo",
    "bis20-hkalitera@mubas.ac.mw": "@hkalitera",
    "bis20-pkansilanga@mubas.ac.mw": "@pkansilanga",
    "bis20-akatantha@mubas.ac.mw": "@akatantha",
    "bis20-imakuwira@mubas.ac.mw": "@imakuwira",
    "bis22-mjobesi@mubas.ac.mw": "@mjobesi",
    "bit18-dmmambo@mubas.ac.mw": "@dmmambo",
    "bit19-mlumanga@mubas.ac.mw": "@mlumanga",
    "bit19-aluwe@mubas.ac.mw": "@aluwe",
    "bit20-schunga@mubas.ac.mw": "@schunga",
    "bit20-jdaka@mubas.ac.mw": "@jdaka",
    "bit20-fdaud@mubas.ac.mw": "@fdaud",
    "bit20-vgondwe@mubas.ac.mw": "@vgondwe",
    "bit20-chowse@mubas.ac.mw": "@chowse",
    "bit20-bisaac@mubas.ac.mw": "@bisaac",
    "bit20-eluphande@mubas.ac.mw": "@eluphande"
    // keep adding more students here following the same pattern
};

// ------------------------ LOGIN PAGE ------------------------
router.get("/login", (req, res) => {
    if (req.session.user) {
        switch (req.session.user.role) {
            case 'admin':
                return res.redirect('/admin/dashboard');
            case 'lecturer':
                return res.redirect('/lecturer/dashboard');
            case 'student':
                return res.redirect('/student/dashboard');
        }
    }
    res.render("auth/login", { error: null });
});

// ------------------------ LOGIN HANDLER ------------------------
router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        let user = null;
        let role = null;

        // --- Check Lecturer with hardcoded passwords ---
        if (defaultLecturerPasswords[email]) {
            if (password === defaultLecturerPasswords[email]) {
                const [lecturerRows] = await req.pool.promise().query(
                    "SELECT * FROM lecturer WHERE email = ?", [email]
                );
                if (lecturerRows.length > 0) {
                    user = lecturerRows[0];
                    role = 'lecturer';
                }
            }
        }

        // --- Check Student with hardcoded passwords ---
        if (!user && defaultStudentPasswords[email]) {
            if (password === defaultStudentPasswords[email]) {
                const [studentRows] = await req.pool.promise().query(
                    "SELECT * FROM student WHERE email = ?", [email]
                );
                if (studentRows.length > 0) {
                    user = studentRows[0];
                    role = 'student';
                }
            }
        }

        // --- Check Admin hardcoded ---
        if (!user && email === 'admin@mubas.ac.mw' && password === 'admin123') {
            user = { first_name: "Thandazani", last_name: "Kalua", email: 'admin@mubas.ac.mw' };
            role = 'admin';
        }

        // --- Fail if still no user ---
        if (!user || !role) {
            return res.render("auth/login", { error: "Invalid email or password" });
        }

        // --- Set session ---
        req.session.user = {
            id: user.registration_number || user.lecturer_id || 'admin',
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email,
            role: role
        };

        // --- Redirect ---
        switch (role) {
            case 'admin':
                return res.redirect('/admin/dashboard');
            case 'lecturer':
                return res.redirect('/lecturer/dashboard');
            case 'student':
                return res.redirect('/student/dashboard');
        }
    } catch (err) {
        console.error(err);
        res.render("auth/login", { error: "An error occurred during login" });
    }
});

module.exports = router;
