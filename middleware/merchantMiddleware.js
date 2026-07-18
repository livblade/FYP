// Person 2: Responsible for role-based merchant access control middleware.
function requireMerchantRole(req, res, next) {
  const role = req.session && req.session.user ? req.session.user.role : null;
  if (role !== 'MERCHANT') {
    if (req.accepts('html')) {
      return res.status(403).render('dashboard/index', {
        title: 'Access Denied',
        user: req.session.user || null
      });
    }
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  return next();
}

module.exports = {
  requireMerchantRole
};