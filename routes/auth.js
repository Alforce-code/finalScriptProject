const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();
const nodemailer = require("nodemailer");
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

// ------------------------ GMAIL SMTP TRANSPORTER ------------------------
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "sebastiangooddays@gmail.com",
        pass: "qvcldrlvehdmazeb"
    }
});

// Verify SMTP connection
transporter.verify((err, success) => {
    if (err) console.error("SMTP Connection Error:", err);
    else console.log("SMTP is ready to send emails");
});

// ------------------------ LOGIN PAGE ------------------------
router.get("/login", (req, res) => {
    if (req.session.user) {
        switch (req.session.user.role) {
            case 'admin': return res.redirect('/admin/dashboard');
            case 'lecturer': return res.redirect('/lecturer/dashboard');
            case 'student': return res.redirect('/student/dashboard');
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

        // --- Database check ---
        if (!user) {
            const [student] = await req.pool.promise().query("SELECT * FROM student WHERE email = ?", [email]);
            const [lecturer] = await req.pool.promise().query("SELECT * FROM lecturer WHERE email = ?", [email]);

            if (student.length > 0) {
                user = student[0];
                role = "student";
            } else if (lecturer.length > 0) {
                user = lecturer[0];
                role = "lecturer";
            } else if (email === 'admin@mubas.ac.mw') {
                const isPasswordValid = await bcrypt.compare(password, await bcrypt.hash("admin123", 10));
                if (isPasswordValid) {
                    user = { first_name: 'Thandazani', last_name: 'Kaluanda', email };
                    role = 'admin';
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
            case 'admin': return res.redirect('/admin/dashboard');
            case 'lecturer': return res.redirect('/lecturer/dashboard');
            case 'student': return res.redirect('/student/dashboard');
        }
    } catch (err) {
        console.error(err);
        res.render("auth/login", { error: "An error occurred during login" });
    }
});

// ------------------------ LOGOUT ------------------------
router.get("/logout", (req, res) => {
    req.session.destroy(err => {
        if (err) console.error(err);
        res.clearCookie('connect.sid');
        res.redirect("/auth/login");
    });
});

// ------------------------ FORGOT PASSWORD ------------------------
router.get("/forgot-password", (req, res) => {
    res.render("auth/forgot-password", { error: null, success: null });
});

router.post("/forgot-password", async (req, res) => {
    const { email } = req.body;

    try {
        const [student] = await req.pool.promise().query(
            "SELECT * FROM student WHERE email = ?", [email]
        );
        const [lecturer] = await req.pool.promise().query(
            "SELECT * FROM lecturer WHERE email = ?", [email]
        );

        let user = student.length > 0 ? student[0] : lecturer.length > 0 ? lecturer[0] : null;

        if (!user) {
            return res.render("auth/forgot-password", { error: "Email not found", success: null });
        }

        const mailOptions = {
            from: "MUBAS Grading System <sebastiangooddays@gmail.com>",
            to: email,
            subject: "Your Account Password",
            html: `<p>Hello,</p><p>Your password is: <b>${user.password}</b></p><p>Keep it safe!</p>`
        };

        await transporter.sendMail(mailOptions);

        res.render("auth/forgot-password", { error: null, success: `Your password has been sent to ${email}.` });

    } catch (err) {
        console.error("Error sending email:", err);
        res.render("auth/forgot-password", { error: "Error sending email. Try again later.", success: null });
    }
});

// ------------------------ CHANGE PASSWORD ------------------------
router.get("/change-password", requireAuth, (req, res) => {
    res.render("auth/change-password", { error: null, success: null, user: req.session.user });
});

router.post("/change-password", requireAuth, async (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const user = req.session.user;

    if (newPassword !== confirmPassword) {
        return res.render("auth/change-password", { error: "Passwords do not match", success: null, user });
    }

    try {
        const table = user.role === "student" ? "student" : "lecturer";
        const idField = user.role === "student" ? "registration_number" : "lecturer_id";

        const [rows] = await req.pool.promise().query(
            `SELECT * FROM ${table} WHERE email = ?`, [user.email]
        );

        if (rows.length === 0) {
            return res.render("auth/change-password", { error: "User not found", success: null, user });
        }

        const dbUser = rows[0];
        const validPassword = await bcrypt.compare(currentPassword, dbUser.password || "");
        if (!validPassword) {
            return res.render("auth/change-password", { error: "Current password is incorrect", success: null, user });
        }

        const hashed = await bcrypt.hash(newPassword, 10);
        await req.pool.promise().query(
            `UPDATE ${table} SET password = ? WHERE ${idField} = ?`,
            [hashed, dbUser[idField]]
        );

        res.render("auth/change-password", { error: null, success: "Password changed successfully!", user });

    } catch (err) {
        console.error(err);
        res.render("auth/change-password", { error: "Error changing password", success: null, user });
    }
});

// ------------------------ REGISTER (ADMIN ONLY) ------------------------
router.get("/register", requireAuth, (req, res) => {
    if (req.session.user.role !== 'admin') return res.redirect('/');
    res.render("auth/register", { error: null, success: null });
});

router.post("/register", requireAuth, async (req, res) => {
    if (req.session.user.role !== 'admin') return res.redirect('/');

    const { role, firstName, lastName, email, password, registrationNumber, program, year } = req.body;

    try {
        if (role === 'student') {
            await req.pool.promise().query(
                "INSERT INTO student (registration_number, first_name, last_name, email, gender) VALUES (?, ?, ?, ?, ?)",
                [registrationNumber, firstName, lastName, email, 'M']
            );
            const classId = `${program}${year}`;
            await req.pool.promise().query(
                "INSERT INTO student_class_enrollment (registration_number, class_id) VALUES (?, ?)",
                [registrationNumber, classId]
            );
        } else if (role === 'lecturer') {
            const lecturerId = `LEC${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
            await req.pool.promise().query(
                "INSERT INTO lecturer (lecturer_id, first_name, last_name, email) VALUES (?, ?, ?, ?)",
                [lecturerId, firstName, lastName, email]
            );
        }

        res.render("auth/register", { error: null, success: "User registered successfully" });

    } catch (err) {
        console.error(err);
        res.render("auth/register", { error: "Error registering user", success: null });
    }
});

module.exports = router;
