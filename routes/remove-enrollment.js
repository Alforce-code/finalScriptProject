// routes/student-routes/remove-enrollment.js
const express = require('express');
const router = express.Router();

// REMOVE ENROLLMENT - POST /admin/remove-enrollment
router.post('/remove-enrollment', async (req, res) => {
    try {
        const { registration_number, class_id } = req.body;
        
        console.log('Removing enrollment:', { registration_number, class_id });
        
        // Validation
        if (!registration_number || !class_id) {
            req.session.message = 'Both student and class are required';
            req.session.messageType = 'danger';
            return res.redirect('/admin/student');
        }
        
        // Remove enrollment
        const [result] = await req.pool.promise().query(
            'DELETE FROM student_class_enrollment WHERE registration_number = ? AND class_id = ?', 
            [registration_number, class_id]
        );
        
        if (result.affectedRows === 0) {
            req.session.message = 'Enrollment not found';
            req.session.messageType = 'danger';
            return res.redirect('/admin/student');
        }
        
        req.session.message = 'Student removed from class successfully';
        req.session.messageType = 'success';
        res.redirect('/admin/student');
        
    } catch (error) {
        console.error('Database error:', error);
        req.session.message = 'Error removing student from class';
        req.session.messageType = 'danger';
        res.redirect('/admin/student');
    }
});

module.exports = router;