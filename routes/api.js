const express = require('express');
const bcrypt = require('bcryptjs'); // Changed to bcryptjs
const router = express.Router();

// ADD LECTURER - POST /admin/add-lecturer
router.post('/add-lecturer', async (req, res) => {
    try {
        const { lecturer_id, first_name, last_name, email, password } = req.body;
        
        console.log('Adding lecturer:', { lecturer_id, first_name, last_name, email });
        
        // Validation
        if (!lecturer_id || !first_name || !last_name || !email) {
            req.session.message = 'All required fields must be filled';
            req.session.messageType = 'danger';
            return res.redirect('/admin/lecturer');
        }
        
        let hashedPassword = '';
        
        // If password is provided, hash it. Otherwise leave it empty.
        if (password && password.trim() !== '') {
            const saltRounds = 10;
            hashedPassword = await bcrypt.hash(password, saltRounds);
        }
        
        const query = 'INSERT INTO lecturer (lecturer_id, first_name, last_name, email, password) VALUES (?, ?, ?, ?, ?)';
        const values = [lecturer_id, first_name, last_name, email, hashedPassword];
        
        await req.pool.promise().query(query, values);
        
        req.session.message = `Lecturer ${first_name} ${last_name} added successfully`;
        req.session.messageType = 'success';
        res.redirect('/admin/lecturer');
        
    } catch (error) {
        console.error('Database error:', error);
        
        if (error.code === 'ER_DUP_ENTRY') {
            if (error.sqlMessage.includes('lecturer_id')) {
                req.session.message = `Lecturer with ID ${req.body.lecturer_id} already exists`;
            } else if (error.sqlMessage.includes('email')) {
                req.session.message = `Lecturer with email ${req.body.email} already exists`;
            } else {
                req.session.message = 'Database error: Duplicate entry';
            }
            req.session.messageType = 'danger';
        } else {
            req.session.message = 'Error adding lecturer to database';
            req.session.messageType = 'danger';
        }
        res.redirect('/admin/lecturer');
    }
});

module.exports = router;