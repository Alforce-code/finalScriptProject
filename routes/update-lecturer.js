const express = require('express');
const router = express.Router();


// UPDATE LECTURER - POST /admin/update-lecturer
router.post('/update-lecturer', (req, res) => {
    const { lecturer_id, first_name, last_name, email, profile_picture } = req.body;
    
    console.log('Updating lecturer:', { lecturer_id, first_name, last_name, email });
    
    // Validation
    if (!lecturer_id || !first_name || !last_name || !email) {
        req.session.message = 'All required fields must be filled';
        req.session.messageType = 'danger';
        return res.redirect('/admin/lecturer');
    }
    
    // First check if lecturer exists
    const checkQuery = 'SELECT * FROM lecturers WHERE lecturer_id = ?';
    pool.query(checkQuery, [lecturer_id], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            req.session.message = 'Error checking lecturer existence';
            req.session.messageType = 'danger';
            return res.redirect('/admin/lecturer');
        }
        
        if (results.length === 0) {
            req.session.message = `Lecturer with ID ${lecturer_id} not found`;
            req.session.messageType = 'danger';
            return res.redirect('/admin/manage-lecturers');
        }
        
        // Check if email is being used by another lecturer
        const emailCheckQuery = 'SELECT * FROM lecturers WHERE email = ? AND lecturer_id != ?';
        pool.query(emailCheckQuery, [email, lecturer_id], (err, emailResults) => {
            if (err) {
                console.error('Database error:', err);
                req.session.message = 'Error checking email availability';
                req.session.messageType = 'danger';
                return res.redirect('/admin/lecturer');
            }
            
            if (emailResults.length > 0) {
                req.session.message = `Email ${email} is already in use by another lecturer`;
                req.session.messageType = 'danger';
                return res.redirect('/admin/lecturer');
            }
            
            // Update lecturer
            const updateQuery = 'UPDATE lecturers SET first_name = ?, last_name = ?, email = ?, profile_picture = ? WHERE lecturer_id = ?';
            const updateValues = [first_name, last_name, email, profile_picture || null, lecturer_id];
            
            db.query(updateQuery, updateValues, (err, result) => {
                if (err) {
                    console.error('Database error:', err);
                    req.session.message = 'Error updating lecturer in database';
                    req.session.messageType = 'danger';
                    return res.redirect('/admin/lecturer');
                }
                
                if (result.affectedRows === 0) {
                    req.session.message = `Lecturer with ID ${lecturer_id} not found`;
                    req.session.messageType = 'danger';
                    return res.redirect('/admin/lecturer');
                }
                
                req.session.message = `Lecturer ${first_name} ${last_name} updated successfully`;
                req.session.messageType = 'success';
                res.redirect('/admin/lecturer');
            });
        });
    });
});

module.exports = router;