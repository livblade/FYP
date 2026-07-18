// Person 1: Responsible for session-based authentication middleware.
function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    if (req.accepts('html')) {
      return res.redirect('/auth/login');
    }
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  return next();
}

function requireGuest(req, res, next) {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }
  return next();
}

module.exports = {
  requireAuth,
  requireGuest
};