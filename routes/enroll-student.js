// routes/student-routes/enroll-student.js
const express = require('express');
const router = express.Router();

// ENROLL STUDENT - POST /admin/enroll-student
router.post('/enroll-student', async (req, res) => {
    try {
        const { registration_number, class_id } = req.body;
        
        console.log('Enrolling student:', { registration_number, class_id });
        
        // Validation
        if (!registration_number || !class_id) {
            req.session.message = 'Both student and class are required';
            req.session.messageType = 'danger';
            return res.redirect('/admin/student');
        }
        
        // Check if enrollment already exists
        const [existingEnrollment] = await req.pool.promise().query(
            'SELECT * FROM student_class_enrollment WHERE registration_number = ? AND class_id = ?', 
            [registration_number, class_id]
        );
        
        if (existingEnrollment.length > 0) {
            req.session.message = 'Student is already enrolled in this class';
            req.session.messageType = 'danger';
            return res.redirect('/admin/student');
        }
        
        // Enroll student
        const query = 'INSERT INTO student_class_enrollment (registration_number, class_id) VALUES (?, ?)';
        await req.pool.promise().query(query, [registration_number, class_id]);
        
        req.session.message = 'Student enrolled in class successfully';
        req.session.messageType = 'success';
        res.redirect('/admin/student');
        
    } catch (error) {
        console.error('Database error:', error);
        req.session.message = 'Error enrolling student in class';
        req.session.messageType = 'danger';
        res.redirect('/admin/student');
    }
});

module.exports = router;