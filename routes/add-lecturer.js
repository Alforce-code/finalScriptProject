const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');

router.post('/add-lecturer', async (req, res) => {
    try {
        const { lecturer_id, first_name, last_name, email, password } = req.body;

        // Validate required fields
        if (!lecturer_id || !first_name || !last_name || !email || !password) {
            req.session.message = 'All fields including password are required';
            req.session.messageType = 'danger';
            return res.redirect('/admin/lecturer');
        }

        // Hash the password before storing
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert into database
        const query = `
            INSERT INTO lecturer (lecturer_id, first_name, last_name, email, password)
            VALUES (?, ?, ?, ?, ?)
        `;
        const values = [lecturer_id, first_name, last_name, email, hashedPassword];

        await req.pool.promise().query(query, values);

        req.session.message = `Lecturer ${first_name} ${last_name} added successfully`;
        req.session.messageType = 'success';
        res.redirect('/admin/lecturer');

    } catch (error) {
        console.error('MySQL Error:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            if (error.sqlMessage.includes('lecturer_id')) {
                req.session.message = `Lecturer ID ${req.body.lecturer_id} already exists`;
            } else if (error.sqlMessage.includes('email')) {
                req.session.message = `Email ${req.body.email} already exists`;
            } else {
                req.session.message = 'Duplicate entry';
            }
        } else {
            req.session.message = `Error adding lecturer: ${error.sqlMessage || error.message}`;
        }
        req.session.messageType = 'danger';
        res.redirect('/admin/lecturer');
    }
});

module.exports = router;
