// Person 1: Responsible for centralized not-found and error response formatting.
function notFoundHandler(req, res) {
  if (req.accepts('html')) {
    return res.status(404).render('dashboard/index', {
      title: 'Not Found',
      user: req.session ? req.session.user : null
    });
  }
  return res.status(404).json({ success: false, message: 'Route not found' });
}

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  const wantsHtml = req.accepts('html');
  const isDataEndpoint = /^\/(payments|notifications|dashboard\/metrics|merchants\/wallets|invoices|settlements)/.test(req.originalUrl);
  const isJsonRequest = req.originalUrl.startsWith('/api') || !wantsHtml || isDataEndpoint;

  if (isJsonRequest) {
    return res.status(statusCode).json({ success: false, message });
  }

  res.status(statusCode);
  return res.render('dashboard/index', {
    title: 'Error',
    user: req.session ? req.session.user : null,
    errorMessage: message
  });
}

module.exports = {
  notFoundHandler,
  errorHandler
};