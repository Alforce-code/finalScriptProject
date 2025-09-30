// middleware/auth.js

const requireAuth = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/landing');
    }
};

const checkUser = (req, res, next) => {
    // Skip for logout route
    if (req.path === '/logout') return next();

    if (req.session.user) {
        res.locals.user = req.session.user; // for templates
    } else {
        res.locals.user = null;
    }
    next();
};

const requireRole = (roles = []) => {
    return (req, res, next) => {
        if (!req.session.user || !roles.includes(req.session.user.role)) {
            return res.status(403).render('error', { message: 'Access denied' });
        }
        next();
    };
};

module.exports = { requireAuth, checkUser, requireRole };