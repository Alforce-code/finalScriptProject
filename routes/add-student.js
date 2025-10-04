// routes/student-routes/add-student.js
const express = require('express');
const router = express.Router();

// ADD STUDENT - POST /admin/add-student
router.post('/add-student', async (req, res) => {
    try {
        const { registration_number, first_name, last_name, email, gender } = req.body;
        
        console.log('Adding student:', { registration_number, first_name, last_name, email, gender });
        
        // Validation
        if (!registration_number || !first_name || !last_name || !email || !gender) {
            req.session.message = 'All required fields must be filled';
            req.session.messageType = 'danger';
            return res.redirect('/admin/student');
        }
        
        const query = 'INSERT INTO student (registration_number, first_name, last_name, email, gender) VALUES (?, ?, ?, ?, ?)';
        const values = [registration_number, first_name, last_name, email, gender];
        
        await req.pool.promise().query(query, values);
        
        req.session.message = `Student ${first_name} ${last_name} added successfully`;
        req.session.messageType = 'success';
        res.redirect('/admin/student');
        
    } catch (error) {
        console.error('Database error:', error);
        
        if (error.code === 'ER_DUP_ENTRY') {
            if (error.sqlMessage.includes('registration_number')) {
                req.session.message = `Student with registration number ${req.body.registration_number} already exists`;
            } else if (error.sqlMessage.includes('email')) {
                req.session.message = `Student with email ${req.body.email} already exists`;
            } else {
                req.session.message = 'Database error: Duplicate entry';
            }
            req.session.messageType = 'danger';
        } else {
            req.session.message = 'Error adding student to database';
            req.session.messageType = 'danger';
        }
        res.redirect('/admin/student');
    }
});

module.exports = router;