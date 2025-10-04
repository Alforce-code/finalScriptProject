// routes/student-routes/delete-student.js
const express = require('express');
const router = express.Router();

// DELETE STUDENT - POST /admin/delete-student
router.post('/delete-student', async (req, res) => {
    try {
        const { registration_number } = req.body;
        
        console.log('Deleting student:', registration_number);
        
        if (!registration_number) {
            req.session.message = 'Registration number is required';
            req.session.messageType = 'danger';
            return res.redirect('/admin/student');
        }
        
        // First get student details for success message
        const [results] = await req.pool.promise().query(
            'SELECT first_name, last_name FROM student WHERE registration_number = ?', 
            [registration_number]
        );
        
        if (results.length === 0) {
            req.session.message = `Student with registration number ${registration_number} not found`;
            req.session.messageType = 'danger';
            return res.redirect('/admin/student');
        }
        
        const student = results[0];
        
        // Delete student enrollments first (foreign key constraint)
        await req.pool.promise().query(
            'DELETE FROM student_class_enrollment WHERE registration_number = ?', 
            [registration_number]
        );
        
        // Delete student
        const [result] = await req.pool.promise().query(
            'DELETE FROM student WHERE registration_number = ?', 
            [registration_number]
        );
        
        if (result.affectedRows === 0) {
            req.session.message = `Student with registration number ${registration_number} not found`;
            req.session.messageType = 'danger';
            return res.redirect('/admin/student');
        }
        
        req.session.message = `Student ${student.first_name} ${student.last_name} deleted successfully`;
        req.session.messageType = 'success';
        res.redirect('/admin/student');
        
    } catch (error) {
        console.error('Database error:', error);
        req.session.message = 'Error deleting student from database';
        req.session.messageType = 'danger';
        res.redirect('/admin/student');
    }
});

module.exports = router;