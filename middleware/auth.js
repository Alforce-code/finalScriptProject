const requireAuth = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/auth/login');
    }
};

// middleware/auth.js
module.exports = {
  requireAuth: (req, res, next) => {
    if (!req.session.user) {
      return res.redirect('/');
    }
    next();
  },

  requireRole: (roles = []) => (req, res, next) => {
    if (!req.session.user || !roles.includes(req.session.user.role)) {
      return res.status(403).send('Access denied');
    }
    next();
  },

  checkUser: (req, res, next) => {
    // Skip for logout route
    if (req.path === '/logout') return next();

    if (req.session.user) {
      res.locals.user = req.session.user; // for templates
    } else {
      res.locals.user = null;
    }
    next();
  }
};


const checkUser = (req, res, next) => {
    if (req.session.user) {
        res.locals.user = req.session.user;
    } else {
        res.locals.user = null;
    }
    next();
};

const requireRole = (roles) => {
    return (req, res, next) => {
        if (req.session.user && roles.includes(req.session.user.role)) {
            next();
        } else {
            res.status(403).render('error', { message: 'Access denied' });
        }
    };
};

module.exports = { requireAuth, checkUser, requireRole };