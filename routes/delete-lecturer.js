const express = require('express');
const router = express.Router();


// DELETE LECTURER - POST /admin/delete-lecturer
router.post('/delete-lecturer', (req, res) => {
    const { lecturer_id } = req.body;
    
    console.log('Deleting lecturer:', lecturer_id);
    
    if (!lecturer_id) {
        req.session.message = 'Lecturer ID is required';
        req.session.messageType = 'danger';
        return res.redirect('/admin/lecturer');
    }
    
    // First get lecturer details for success message
    const selectQuery = 'SELECT first_name, last_name FROM lecturers WHERE lecturer_id = ?';
    db.query(selectQuery, [lecturer_id], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            req.session.message = 'Error finding lecturer';
            req.session.messageType = 'danger';
            return res.redirect('/admin/lecturer');
        }
        
        if (results.length === 0) {
            req.session.message = `Lecturer with ID ${lecturer_id} not found`;
            req.session.messageType = 'danger';
            return res.redirect('/admin/lecturer');
        }
        
        const lecturer = results[0];
        
        // Delete lecturer
        const deleteQuery = 'DELETE FROM lecturers WHERE lecturer_id = ?';
        db.query(deleteQuery, [lecturer_id], (err, result) => {
            if (err) {
                console.error('Database error:', err);
                req.session.message = 'Error deleting lecturer from database';
                req.session.messageType = 'danger';
                return res.redirect('/admin/lecturer');
            }
            
            if (result.affectedRows === 0) {
                req.session.message = `Lecturer with ID ${lecturer_id} not found`;
                req.session.messageType = 'danger';
                return res.redirect('/admin/lecturer');
            }
            
            req.session.message = `Lecturer ${lecturer.first_name} ${lecturer.last_name} deleted successfully`;
            req.session.messageType = 'success';
            res.redirect('/admin/lecturer');
        });
    });
});

module.exports = router;