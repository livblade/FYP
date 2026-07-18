// Person 4: Responsible for API protection middleware and request throttling.
const requestMap = new Map();

function apiRateLimit(options = {}) {
  const windowMs = options.windowMs || 60 * 1000;
  const maxRequests = options.maxRequests || 120;

  return (req, res, next) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const bucket = requestMap.get(key) || { count: 0, resetAt: now + windowMs };

    if (now > bucket.resetAt) {
      bucket.count = 0;
      bucket.resetAt = now + windowMs;
    }

    bucket.count += 1;
    requestMap.set(key, bucket);

    if (bucket.count > maxRequests) {
      return res.status(429).json({ success: false, message: 'Too many requests' });
    }

    return next();
  };
}

module.exports = {
  apiRateLimit
};