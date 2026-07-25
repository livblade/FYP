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

function verifyInternalApiKey(req, res, next) {
  const configuredKey = process.env.INTERNAL_API_KEY;
  if (process.env.NODE_ENV !== 'production' && !configuredKey) {
    return next();
  }

  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== configuredKey) {
    return res.status(401).json({ success: false, message: 'Invalid API key' });
  }
  return next();
}

function requireAdminRole(req, res, next) {
  if (req.session?.user?.role !== 'ADMIN') {
    // A real app might render a 403 page.
    // For simplicity, we send a plain text response.
    return res.status(403).send('Forbidden: Administrator access required.');
  }
  return next();
}

module.exports = {
  requireAuth,
  requireGuest,
  verifyInternalApiKey,
  requireAdminRole
};