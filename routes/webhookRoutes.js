// Person 4: Responsible for external webhook routes.
const express = require('express');
const webhookController = require('../controllers/webhookController');
const { apiRateLimit } = require('../middleware/rateLimitMiddleware');

const router = express.Router();

router.post('/alchemy', apiRateLimit({ windowMs: 60 * 1000, maxRequests: 300 }), webhookController.alchemyWebhook);
router.post('/n8n', apiRateLimit({ windowMs: 60 * 1000, maxRequests: 300 }), webhookController.n8nWebhook);

module.exports = router;