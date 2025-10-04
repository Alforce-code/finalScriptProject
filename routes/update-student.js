// routes/student-routes/update-student.js
const express = require('express');
const router = express.Router();

// UPDATE STUDENT - POST /admin/update-student
router.post('/update-student', async (req, res) => {
    try {
        const { registration_number, first_name, last_name, email, gender } = req.body;
        
        console.log('Updating student:', { registration_number, first_name, last_name, email, gender });
        
        // Validation
        if (!registration_number || !first_name || !last_name || !email || !gender) {
            req.session.message = 'All required fields must be filled';
            req.session.messageType = 'danger';
            return res.redirect('/admin/student');
        }
        
        // Check if email is being used by another student
        const [emailResults] = await req.pool.promise().query(
            'SELECT * FROM student WHERE email = ? AND registration_number != ?', 
            [email, registration_number]
        );
        
        if (emailResults.length > 0) {
            req.session.message = `Email ${email} is already in use by another student`;
            req.session.messageType = 'danger';
            return res.redirect('/admin/student');
        }
        
        // Update student
        const updateQuery = 'UPDATE student SET first_name = ?, last_name = ?, email = ?, gender = ? WHERE registration_number = ?';
        const updateValues = [first_name, last_name, email, gender, registration_number];
        
        const [result] = await req.pool.promise().query(updateQuery, updateValues);
        
        if (result.affectedRows === 0) {
            req.session.message = `Student with registration number ${registration_number} not found`;
            req.session.messageType = 'danger';
            return res.redirect('/admin/student');
        }
        
        req.session.message = `Student ${first_name} ${last_name} updated successfully`;
        req.session.messageType = 'success';
        res.redirect('/admin/student');
        
    } catch (error) {
        console.error('Database error:', error);
        req.session.message = 'Error updating student in database';
        req.session.messageType = 'danger';
        res.redirect('/admin/student');
    }
});

module.exports = router;